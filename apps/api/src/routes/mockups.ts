import {
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_QUALITIES,
  type GenerateMockupRequest,
  type GenerateMockupResponse,
  type MockupAspectRatio,
  type MockupJob,
  type MockupQuality,
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
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    const safe = safeHttpError(error, 'invalid_mockup_request', 'Invalid mockup request.', 400)
    return errorResponse(safe.code, safe.message, safe.status, origin)
  }

  const stored = await repository.upsert(pending)

  let providerResult: ProviderImageResult
  try {
    providerResult = await callGeminiForImage(env, {
      prompt,
      referenceNotes,
      aspectRatio,
      quality,
      referenceImages,
    })
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

  const completed = await repository.upsert({
    ...stored,
    status: 'completed',
    imageUrl,
    imageData,
    mimeType: providerResult.mimeType,
    error: '',
    updatedAt: new Date().toISOString(),
  })

  const responseBody: GenerateMockupResponse = { job: completed }
  return jsonResponse(responseBody, 200, origin)
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
}

interface ProviderImageResult {
  imageUrl: string
  imageData: string
  mimeType: string
}

export function buildMockupPrompt(input: Pick<ProviderImageRequest, 'prompt' | 'referenceNotes' | 'aspectRatio' | 'quality'>) {
  const lines = [input.prompt]
  if (input.referenceNotes) {
    lines.push(`Reference notes: ${input.referenceNotes}`)
  }
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
