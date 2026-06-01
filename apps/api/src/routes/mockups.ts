import {
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_IMAGE_MODES,
  MOCKUP_PRODUCT_MODES,
  MOCKUP_QUALITIES,
  type GenerateMockupRequest,
  type GenerateMockupResponse,
  type MockupAspectRatio,
  type MockupImageMode,
  type MockupJob,
  type MockupPrintFields,
  type MockupProductMode,
  type MockupQuality,
  type MockupQualityReport,
  type MockupReference,
} from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { normalizeMockupJobInput, type MockupJobListFilters } from '../db/mockupJobsRepository.js'
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJson,
  resolveOrigin,
  safeHttpError,
} from '../http.js'
import {
  buildFallbackMockupReport,
  normalizeMockupQualityReport,
  type MockupQualityHeuristicInput,
} from '../lib/quality.js'

export interface MockupJobsRepository {
  list(filters?: MockupJobListFilters): Promise<MockupJob[]>
  get(id: string): Promise<MockupJob | null>
  upsert(job: MockupJob): Promise<MockupJob>
  delete(id: string): Promise<void>
}

const MAX_IMAGE_DATA_BYTES = 4 * 1024 * 1024
// Allow a generate body up to 3 references × 2 MB + slack for prompt and JSON overhead.
const MAX_GENERATE_BODY_BYTES = 8 * 1024 * 1024

export async function mockupsRoute(request: Request, env: ApiEnv, repository: MockupJobsRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')

  try {
    if (request.method === 'POST' && pathname === '/api/mockups/generate') {
      return await handleGenerate(request, env, repository, origin)
    }

    if (request.method === 'GET' && pathname === '/api/mockups') {
      const filters: MockupJobListFilters = {
        status: url.searchParams.get('status') ?? undefined,
        briefId: url.searchParams.get('brief') ?? url.searchParams.get('briefId') ?? undefined,
        releaseId: url.searchParams.get('release') ?? url.searchParams.get('releaseId') ?? undefined,
      }
      return jsonResponse({ jobs: await repository.list(filters) }, 200, origin)
    }

    const downloadMatch = pathname.match(/^\/api\/mockups\/([^/]+)\/download$/)
    if (downloadMatch && request.method === 'GET') {
      const jobId = decodeURIComponent(downloadMatch[1] ?? '')
      return await handleDownload(jobId, repository, origin)
    }

    if (pathname.startsWith('/api/mockups/')) {
      const jobId = decodeURIComponent(pathname.replace('/api/mockups/', ''))
      if (!jobId.includes('/') && jobId !== 'generate') {
        if (request.method === 'GET') {
          const job = await repository.get(jobId)
          if (!job) return errorResponse('mockup_not_found', 'Mockup job not found.', 404, origin)
          return jsonResponse({ job }, 200, origin)
        }
        if (request.method === 'DELETE') {
          await repository.delete(jobId)
          return jsonResponse({}, 204, origin)
        }
      }
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'mockup_failed', 'Mockup request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}

async function handleGenerate(
  request: Request,
  env: ApiEnv,
  repository: MockupJobsRepository,
  origin: string,
) {
  const body = await readJson<Partial<GenerateMockupRequest>>(request, MAX_GENERATE_BODY_BYTES)
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return errorResponse('invalid_mockup_request', 'Prompt is required.', 400, origin)
  }
  if (!env.geminiApiKey) {
    return errorResponse('mockups_not_configured', 'Image provider is not configured.', 503, origin)
  }

  const aspectRatio = pickEnum(body.aspect_ratio, MOCKUP_ASPECT_RATIOS, '1:1')
  const quality = pickEnum(body.quality, MOCKUP_QUALITIES, 'standard')
  const referenceNotes = typeof body.reference_notes === 'string' ? body.reference_notes.trim() : ''
  const briefId = typeof body.brief_id === 'string' ? body.brief_id.trim() : ''
  const releaseId = typeof body.release_id === 'string' ? body.release_id.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
  const referenceImages = Array.isArray(body.reference_images) ? body.reference_images : []

  const productMode = pickOptionalEnum(body.product_mode, MOCKUP_PRODUCT_MODES)
  const imageMode = pickOptionalEnum(body.image_mode, MOCKUP_IMAGE_MODES)
  const garmentColor = sanitizeString(body.garment_color)
  const fabric = sanitizeString(body.fabric)
  const printMethod = sanitizeString(body.print_method)
  const placement = sanitizeString(body.placement)
  const designText = sanitizeString(body.design_text)
  const typographyPreset = sanitizeString(body.typography_preset)
  const typographyFreeform = sanitizeString(body.typography_freeform)
  const printFields = normalizePrintFields(body.print_fields)

  const now = new Date().toISOString()
  let pending: MockupJob
  try {
    // Validate up-front so a bad reference rejects with 400 BEFORE we touch the DB.
    pending = normalizeMockupJobInput({
      id: generateJobId(),
      prompt,
      referenceNotes,
      aspectRatio,
      quality,
      status: 'pending',
      modelUsed: env.geminiImageModel,
      imageUrl: '',
      imageData: '',
      mimeType: '',
      error: '',
      releaseId,
      briefId,
      notes,
      referenceImages,
      productMode,
      imageMode,
      garmentColor,
      fabric,
      printMethod,
      placement,
      designText,
      typographyPreset,
      typographyFreeform,
      printFields,
      qualityReport: null,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    const safe = safeHttpError(error, 'invalid_mockup_request', 'Invalid mockup request.', 400)
    return errorResponse(safe.code, safe.message, safe.status, origin)
  }

  const stored = await repository.upsert(pending)

  const providerRequest: ProviderImageRequest = {
    prompt,
    referenceNotes,
    aspectRatio,
    quality,
    referenceImages,
    productMode,
    imageMode,
    garmentColor,
    fabric,
    printMethod,
    placement,
    designText,
    typographyDirection: typographyFreeform || typographyPreset,
    printFields,
  }

  let providerResult: ProviderImageResult
  try {
    providerResult = await callGeminiForImage(env, providerRequest)
  } catch (error) {
    const failed = await repository.upsert({
      ...stored,
      status: 'failed',
      error: sanitizedFailureMessage(error),
      updatedAt: new Date().toISOString(),
    })
    const responseBody: GenerateMockupResponse = { job: failed }
    return jsonResponse(responseBody, 200, origin)
  }

  if (!providerResult.imageUrl && !providerResult.imageData) {
    const failed = await repository.upsert({
      ...stored,
      status: 'failed',
      error: 'Image provider returned no image data.',
      updatedAt: new Date().toISOString(),
    })
    const responseBody: GenerateMockupResponse = { job: failed }
    return jsonResponse(responseBody, 200, origin)
  }

  let imageData = providerResult.imageData
  const imageUrl = providerResult.imageUrl
  if (imageData && Buffer.byteLength(imageData, 'utf8') > MAX_IMAGE_DATA_BYTES) {
    if (!imageUrl) {
      const failed = await repository.upsert({
        ...stored,
        status: 'failed',
        error: 'Image payload exceeded the 4 MB inline limit.',
        updatedAt: new Date().toISOString(),
      })
      const responseBody: GenerateMockupResponse = { job: failed }
      return jsonResponse(responseBody, 200, origin)
    }
    imageData = ''
  }

  // Build the quality report. AI-based image QA may fail (or be too slow); fall back to a
  // heuristic check so the UI always gets a structured report.
  const heuristicInput: MockupQualityHeuristicInput = {
    productMode,
    imageMode,
    fabric,
    placement,
    prompt,
    designText,
    typographyDirection: providerRequest.typographyDirection,
  }
  const qualityReport: MockupQualityReport = await assessMockupQuality(env, heuristicInput, {
    imageData,
    imageUrl,
    mimeType: providerResult.mimeType,
  }).catch(() => buildFallbackMockupReport(heuristicInput))

  const completed = await repository.upsert({
    ...stored,
    status: 'completed',
    imageUrl,
    imageData,
    mimeType: providerResult.mimeType,
    error: '',
    qualityReport,
    updatedAt: new Date().toISOString(),
  })

  const responseBody: GenerateMockupResponse = { job: completed }
  return jsonResponse(responseBody, 200, origin)
}

function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pickOptionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  if (typeof value !== 'string') return ''
  return (allowed as readonly string[]).includes(value) ? (value as T) : ''
}

function normalizePrintFields(value: unknown): MockupPrintFields {
  if (!value || typeof value !== 'object') {
    return { front: '', back: '', sleeve: '', printSizeCm: '' }
  }
  const record = value as Record<string, unknown>
  return {
    front: sanitizeString(record.front),
    back: sanitizeString(record.back),
    sleeve: sanitizeString(record.sleeve),
    printSizeCm: sanitizeString(record.printSizeCm),
  }
}

async function handleDownload(jobId: string, repository: MockupJobsRepository, origin: string) {
  if (!jobId) return errorResponse('mockup_not_found', 'Mockup job not found.', 404, origin)
  const job = await repository.get(jobId)
  if (!job) return errorResponse('mockup_not_found', 'Mockup job not found.', 404, origin)
  if (job.status !== 'completed') {
    return errorResponse('mockup_image_unavailable', 'Mockup image is not available.', 404, origin)
  }

  const mimeType = job.mimeType || 'image/png'
  const filename = buildDownloadFilename(job.id, mimeType)
  const headers: Record<string, string> = {
    'content-type': mimeType,
    'content-disposition': `attachment; filename="${filename}"`,
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    vary: 'Origin',
  }

  if (job.imageData) {
    const buffer = Buffer.from(job.imageData, 'base64')
    return new Response(buffer, { status: 200, headers })
  }

  if (job.imageUrl) {
    try {
      const upstream = await fetch(job.imageUrl)
      if (!upstream.ok) {
        return errorResponse('mockup_image_unavailable', 'Mockup image is not available.', 404, origin)
      }
      const arrayBuffer = await upstream.arrayBuffer()
      return new Response(Buffer.from(arrayBuffer), { status: 200, headers })
    } catch {
      return errorResponse('mockup_image_unavailable', 'Mockup image is not available.', 404, origin)
    }
  }

  return errorResponse('mockup_image_unavailable', 'Mockup image is not available.', 404, origin)
}

function buildDownloadFilename(id: string, mimeType: string): string {
  const ext = mimeTypeToExtension(mimeType)
  const today = new Date().toISOString().slice(0, 10)
  const safeId = id.replace(/[^A-Za-z0-9._-]/g, '_') || 'mockup'
  return `agorase-mockup-${safeId}-${today}.${ext}`
}

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpeg'
  if (mimeType === 'image/webp') return 'webp'
  return 'png'
}

interface ProviderImageRequest {
  prompt: string
  referenceNotes: string
  aspectRatio: MockupAspectRatio
  quality: MockupQuality
  referenceImages: MockupReference[]
  productMode: MockupProductMode | ''
  imageMode: MockupImageMode | ''
  garmentColor: string
  fabric: string
  printMethod: string
  placement: string
  designText: string
  typographyDirection: string
  printFields: MockupPrintFields
}

interface ProviderImageResult {
  imageUrl: string
  imageData: string
  mimeType: string
}

// RHE prompt construction — see rhe-fashion-studio/src/lib/gemini.ts:buildMockupPrompt.
// Mode guides are translated from RHE one-to-one so the same Gemini prompt yields
// comparable images across both apps.
const IMAGE_MODE_GUIDES: Record<MockupImageMode, string> = {
  Flatlay:
    'flatlay product photography, garment perfectly arranged, visible seams, no human model',
  'Model-Shot':
    'realistic model wearing the garment, contemporary streetwear styling, natural body proportions',
  'Ghost-Mannequin':
    'premium ghost mannequin e-commerce mockup, clean volume, realistic sleeve and hem structure',
  Lookbook:
    'editorial campaign lookbook frame, urban spiritual streetwear mood, cinematic but product-readable',
  'Tech Pack View':
    'technical apparel flat drawing, front and back view on a clean white production sheet, print placement dimensions, material swatch, construction callouts, manufacturer-ready spec layout',
}

export function buildMockupPrompt(input: ProviderImageRequest): string {
  const lines: string[] = []
  if (input.productMode || input.imageMode) {
    lines.push(
      'Generate a photorealistic, fashion-industry-grade product mockup for an Agorase capsule drop.',
    )
    if (input.productMode) lines.push(`Garment: ${input.productMode}.`)
    if (input.imageMode) {
      const guide = IMAGE_MODE_GUIDES[input.imageMode]
      lines.push(`Mockup mode: ${input.imageMode} (${guide}).`)
    }
    if (input.garmentColor) lines.push(`Garment color: ${input.garmentColor}.`)
    if (input.fabric) lines.push(`Fabric and weight: ${input.fabric}.`)
    if (input.printMethod) lines.push(`Print method: ${input.printMethod}.`)
    if (input.placement) lines.push(`Print placement: ${input.placement}.`)
    if (input.printFields.front) lines.push(`Front print: ${input.printFields.front}.`)
    if (input.printFields.back) lines.push(`Back print: ${input.printFields.back}.`)
    if (input.printFields.sleeve) lines.push(`Sleeve print: ${input.printFields.sleeve}.`)
    if (input.printFields.printSizeCm)
      lines.push(`Print size (cm): ${input.printFields.printSizeCm}.`)
    if (input.designText) lines.push(`Exact visible design text if used: "${input.designText}".`)
    if (input.typographyDirection)
      lines.push(`Typography direction: ${input.typographyDirection}.`)
    lines.push(`Creative direction: ${input.prompt}`)
    lines.push(
      'Brand mood: contemporary streetwear, confident, premium, no kitsch, no generic stock-photo energy.',
    )
    lines.push(
      'Fashion constraints: realistic cotton fleece/jersey texture, plausible drape, correct neck ribbing, cuffs, hems, seams, sleeve proportions, and print scale.',
    )
    lines.push(
      'Typography constraints: use the requested font style as a visual direction, keep the exact design text readable, no misspellings, no warped letters, no random extra words.',
    )
    lines.push(
      'Lighting: professional studio or editorial light, high product readability, no fake logos beyond requested text.',
    )

    if (input.imageMode === 'Tech Pack View') {
      lines.push(
        'For this output, prioritize a clean technical fashion production sheet over lifestyle realism.',
      )
      lines.push(
        'Show FRONT and BACK garment flats side by side, with clear labels, print placement callouts, approximate print dimensions, material block, sleeve/cuff/hem notes, and construction annotations.',
      )
      lines.push(
        'Do not show a human model, hanger, mannequin, dramatic shadows, lifestyle scene, or campaign background.',
      )
    }
  } else {
    // Legacy callers (no product mode) — keep the existing minimal prompt shape.
    lines.push(input.prompt)
  }

  if (input.referenceNotes) lines.push(`Reference notes: ${input.referenceNotes}`)
  lines.push(`Aspect ratio: ${input.aspectRatio}.`)
  lines.push(`Quality: ${input.quality}.`)
  return lines.join('\n')
}

async function callGeminiForImage(env: ApiEnv, input: ProviderImageRequest): Promise<ProviderImageResult> {
  const promptText = buildMockupPrompt(input)
  const parts: Array<Record<string, unknown>> = []
  for (const ref of input.referenceImages) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } })
  }
  parts.push({ text: promptText })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiImageModel)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: input.aspectRatio,
          },
        },
      }),
    },
  )

  if (!response.ok) {
    throw new HttpError('mockup_failed', 'Image provider is temporarily unavailable.', 502)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string }
          fileData?: { fileUri?: string; mimeType?: string }
        }>
      }
    }>
  }

  const responseParts = payload.candidates?.[0]?.content?.parts ?? []
  let imageData = ''
  let imageUrl = ''
  let mimeType = ''
  for (const part of responseParts) {
    if (!imageData && part.inlineData?.data) {
      imageData = part.inlineData.data
      mimeType = part.inlineData.mimeType ?? mimeType
    }
    if (!imageUrl && part.fileData?.fileUri) {
      imageUrl = part.fileData.fileUri
      mimeType = part.fileData.mimeType ?? mimeType
    }
  }

  return { imageUrl, imageData, mimeType }
}

async function assessMockupQuality(
  env: ApiEnv,
  input: MockupQualityHeuristicInput,
  image: { imageData: string; imageUrl: string; mimeType: string },
): Promise<MockupQualityReport> {
  let imageData = image.imageData
  let mimeType = image.mimeType || 'image/png'
  if (!imageData && image.imageUrl) {
    // Without inline bytes we can't pass the image into Gemini's text endpoint.
    const downloadResponse = await fetch(image.imageUrl).catch(() => null)
    if (!downloadResponse || !downloadResponse.ok) return buildFallbackMockupReport(input)
    const buffer = Buffer.from(await downloadResponse.arrayBuffer())
    imageData = buffer.toString('base64')
    mimeType = downloadResponse.headers.get('content-type') || mimeType
  }
  if (!imageData) return buildFallbackMockupReport(input)

  const prompt = [
    'Du bist Senior Fashion Art Director und Production QA fuer einen Agorase Drop.',
    'Bewerte das angehaengte generierte Mockup streng nach Mode-Standard.',
    `Garment: ${input.productMode || 'Streetwear-Piece'}. Bildmodus: ${input.imageMode || 'frei'}. Placement: ${input.placement}. Design-Text: ${input.designText}. Typography: ${input.typographyDirection}.`,
    'Pruefe: Fit/Proportion, Stoffrealismus, Print-Platzierung, Schriftstil, Text-Lesbarkeit, Brand-Fit, Produktionsnutzbarkeit, Artefakte/Warping.',
    'Antworte nur als JSON Objekt mit score 1-100, status ("ready"|"review"|"blocked"), summary, checks Array {label,status,note}, recommendations Array.',
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiTextModel)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: imageData } }, { text: prompt }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )

  if (!response.ok) return buildFallbackMockupReport(input)

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ?? '{}'
  let parsed: unknown
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {}
  }
  return normalizeMockupQualityReport(parsed, input)
}

function sanitizedFailureMessage(error: unknown) {
  if (error instanceof HttpError) return error.message
  return 'Image provider is temporarily unavailable.'
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function generateJobId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `mockup-${Date.now().toString(36)}-${random}`
}
