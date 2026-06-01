import type {
  BrainstormRequest,
  BrainstormResponse,
  CreativeBrief,
  CreativeDirection,
  DropConcept,
  DropConceptRequest,
  DropConceptResponse,
  PromptTemplate,
} from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import type { CreativeBriefListFilters } from '../db/creativeBriefsRepository.js'
import type { CreativeDirectionListFilters } from '../db/creativeDirectionsRepository.js'
import { errorResponse, HttpError, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'
import { toText, toTextArray } from '../lib/quality.js'

export interface CreativeBriefsRepository {
  list(filters?: CreativeBriefListFilters): Promise<CreativeBrief[]>
  get(id: string): Promise<CreativeBrief | null>
  upsert(brief: CreativeBrief): Promise<CreativeBrief>
  delete(id: string): Promise<void>
}

export interface CreativeDirectionsRepository {
  list(filters?: CreativeDirectionListFilters): Promise<CreativeDirection[]>
  get(id: string): Promise<CreativeDirection | null>
  upsert(direction: CreativeDirection): Promise<CreativeDirection>
  delete(id: string): Promise<void>
}

export interface PromptTemplatesRepository {
  list(): Promise<PromptTemplate[]>
  get(id: string): Promise<PromptTemplate | null>
  upsert(template: PromptTemplate): Promise<PromptTemplate>
  delete(id: string): Promise<void>
}

export interface CreativeRepositories {
  briefs: CreativeBriefsRepository
  directions: CreativeDirectionsRepository
  templates: PromptTemplatesRepository
}

export async function creativeRoute(request: Request, env: ApiEnv, repositories: CreativeRepositories) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')

  try {
    if (pathname === '/api/creative/brainstorm' && request.method === 'POST') {
      return await handleBrainstorm(request, env, repositories, origin)
    }

    if (pathname === '/api/creative/concepts' && request.method === 'POST') {
      return await handleDropConcepts(request, env, origin)
    }

    if (pathname === '/api/creative/briefs' || pathname.startsWith('/api/creative/briefs/')) {
      return await handleBriefs(request, repositories.briefs, pathname, url, origin)
    }

    if (pathname === '/api/creative/directions' || pathname.startsWith('/api/creative/directions/')) {
      return await handleDirections(request, repositories.directions, pathname, url, origin)
    }

    if (
      pathname === '/api/creative/prompt-templates' ||
      pathname.startsWith('/api/creative/prompt-templates/')
    ) {
      return await handleTemplates(request, repositories.templates, pathname, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'creative_failed', 'Creative request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}

async function handleBriefs(
  request: Request,
  repository: CreativeBriefsRepository,
  pathname: string,
  url: URL,
  origin: string,
) {
  const briefId = decodeURIComponent(pathname.replace('/api/creative/briefs/', ''))

  if (request.method === 'GET' && pathname === '/api/creative/briefs') {
    const filters: CreativeBriefListFilters = {
      status: url.searchParams.get('status') ?? undefined,
      releaseId: url.searchParams.get('release') ?? url.searchParams.get('releaseId') ?? undefined,
    }
    return jsonResponse({ briefs: await repository.list(filters) }, 200, origin)
  }

  if (request.method === 'POST' && pathname === '/api/creative/briefs') {
    const body = await readJson<CreativeBrief>(request)
    return jsonResponse({ brief: await repository.upsert(body) }, 200, origin)
  }

  if (pathname.startsWith('/api/creative/briefs/') && !briefId.includes('/')) {
    if (request.method === 'GET') {
      const brief = await repository.get(briefId)
      if (!brief) return errorResponse('creative_brief_not_found', 'Creative brief not found.', 404, origin)
      return jsonResponse({ brief }, 200, origin)
    }
    if (request.method === 'PUT') {
      const body = await readJson<Partial<CreativeBrief>>(request)
      return jsonResponse(
        { brief: await repository.upsert({ ...(body as CreativeBrief), id: briefId }) },
        200,
        origin,
      )
    }
    if (request.method === 'PATCH') {
      const body = await readJson<Partial<CreativeBrief>>(request)
      const existing = await repository.get(briefId)
      const merged = (existing ? { ...existing, ...body } : body) as CreativeBrief
      return jsonResponse({ brief: await repository.upsert({ ...merged, id: briefId }) }, 200, origin)
    }
    if (request.method === 'DELETE') {
      await repository.delete(briefId)
      return jsonResponse({}, 204, origin)
    }
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

async function handleDirections(
  request: Request,
  repository: CreativeDirectionsRepository,
  pathname: string,
  url: URL,
  origin: string,
) {
  const directionId = decodeURIComponent(pathname.replace('/api/creative/directions/', ''))

  if (request.method === 'GET' && pathname === '/api/creative/directions') {
    const filters: CreativeDirectionListFilters = {
      briefId: url.searchParams.get('brief') ?? url.searchParams.get('briefId') ?? undefined,
    }
    return jsonResponse({ directions: await repository.list(filters) }, 200, origin)
  }

  if (request.method === 'POST' && pathname === '/api/creative/directions') {
    const body = await readJson<CreativeDirection>(request)
    return jsonResponse({ direction: await repository.upsert(body) }, 200, origin)
  }

  if (pathname.startsWith('/api/creative/directions/') && !directionId.includes('/')) {
    if (request.method === 'GET') {
      const direction = await repository.get(directionId)
      if (!direction) {
        return errorResponse('creative_direction_not_found', 'Creative direction not found.', 404, origin)
      }
      return jsonResponse({ direction }, 200, origin)
    }
    if (request.method === 'PUT') {
      const body = await readJson<Partial<CreativeDirection>>(request)
      return jsonResponse(
        { direction: await repository.upsert({ ...(body as CreativeDirection), id: directionId }) },
        200,
        origin,
      )
    }
    if (request.method === 'PATCH') {
      const body = await readJson<Partial<CreativeDirection>>(request)
      const existing = await repository.get(directionId)
      const merged = (existing ? { ...existing, ...body } : body) as CreativeDirection
      return jsonResponse(
        { direction: await repository.upsert({ ...merged, id: directionId }) },
        200,
        origin,
      )
    }
    if (request.method === 'DELETE') {
      await repository.delete(directionId)
      return jsonResponse({}, 204, origin)
    }
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

async function handleTemplates(
  request: Request,
  repository: PromptTemplatesRepository,
  pathname: string,
  origin: string,
) {
  const templateId = decodeURIComponent(pathname.replace('/api/creative/prompt-templates/', ''))

  if (request.method === 'GET' && pathname === '/api/creative/prompt-templates') {
    return jsonResponse({ templates: await repository.list() }, 200, origin)
  }

  if (request.method === 'POST' && pathname === '/api/creative/prompt-templates') {
    const body = await readJson<PromptTemplate>(request)
    return jsonResponse({ template: await repository.upsert(body) }, 200, origin)
  }

  if (pathname.startsWith('/api/creative/prompt-templates/') && !templateId.includes('/')) {
    if (request.method === 'GET') {
      const template = await repository.get(templateId)
      if (!template) {
        return errorResponse('prompt_template_not_found', 'Prompt template not found.', 404, origin)
      }
      return jsonResponse({ template }, 200, origin)
    }
    if (request.method === 'PUT') {
      const body = await readJson<Partial<PromptTemplate>>(request)
      return jsonResponse(
        { template: await repository.upsert({ ...(body as PromptTemplate), id: templateId }) },
        200,
        origin,
      )
    }
    if (request.method === 'DELETE') {
      await repository.delete(templateId)
      return jsonResponse({}, 204, origin)
    }
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

async function handleBrainstorm(
  request: Request,
  env: ApiEnv,
  repositories: CreativeRepositories,
  origin: string,
) {
  const body = await readJson<Partial<BrainstormRequest>>(request)
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return errorResponse('invalid_brainstorm_request', 'Prompt is required.', 400, origin)
  }
  if (!env.geminiApiKey) {
    return errorResponse('brainstorm_not_configured', 'AI provider is not configured.', 503, origin)
  }

  const count = clampCount(Number(body.count) || 3)
  const templateId = typeof body.template_id === 'string' ? body.template_id.trim() : ''
  const briefId = typeof body.brief_id === 'string' ? body.brief_id.trim() : ''

  let templateBody = ''
  if (templateId) {
    const template = await repositories.templates.get(templateId)
    if (template) templateBody = template.body
  }

  const finalPrompt = buildBrainstormPrompt(templateBody, prompt, count)

  let providerText: string
  try {
    providerText = await callGeminiForBrainstorm(env, finalPrompt)
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError('brainstorm_failed', 'Creative brainstorm provider is temporarily unavailable.', 502)
  }

  const directions = parseBrainstormDirections(providerText, {
    briefId,
    promptUsed: finalPrompt,
    modelUsed: env.geminiTextModel,
  })

  const response: BrainstormResponse = {
    directions,
    model: env.geminiTextModel,
    prompt: finalPrompt,
  }
  return jsonResponse(response, 200, origin)
}

export function buildBrainstormPrompt(templateBody: string, prompt: string, count: number) {
  const header = templateBody ? `${templateBody}\n\n` : ''
  return (
    `${header}${prompt}\n\n` +
    `Generate ${count} distinct fashion direction concepts as a JSON array. ` +
    `Each entry must include the keys: title, summary, body, keywords, palette, materials, silhouettes. ` +
    `Return only the JSON array.`
  )
}

async function callGeminiForBrainstorm(env: ApiEnv, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiTextModel)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    },
  )

  if (!response.ok) {
    throw new HttpError('brainstorm_failed', 'Creative brainstorm provider is temporarily unavailable.', 502)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ?? ''
}

export interface ParseBrainstormContext {
  briefId: string
  promptUsed: string
  modelUsed: string
}

export function parseBrainstormDirections(
  rawText: string,
  context: ParseBrainstormContext,
): CreativeDirection[] {
  const text = rawText.trim()
  if (!text) return []

  const stripped = stripJsonFences(text)
  try {
    const parsed = JSON.parse(stripped) as unknown
    const list = Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : Array.isArray((parsed as { directions?: unknown[] })?.directions)
        ? ((parsed as { directions: Record<string, unknown>[] }).directions)
        : null
    if (!list) {
      return [fallbackDirection(text, context)]
    }
    return list.map((entry, index) => normalizeAiDirection(entry, context, index))
  } catch {
    return [fallbackDirection(text, context)]
  }
}

function stripJsonFences(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('```')) {
    const withoutLeading = trimmed.replace(/^```(?:json)?\s*/i, '')
    return withoutLeading.replace(/```\s*$/i, '').trim()
  }
  return trimmed
}

function normalizeAiDirection(
  entry: Record<string, unknown>,
  context: ParseBrainstormContext,
  index: number,
): CreativeDirection {
  const now = new Date().toISOString()
  return {
    id: generateDirectionId(index),
    briefId: context.briefId,
    title: pickString(entry.title) || `Direction ${index + 1}`,
    summary: pickString(entry.summary),
    body: pickString(entry.body),
    keywords: pickList(entry.keywords),
    palette: pickList(entry.palette),
    materials: pickList(entry.materials),
    silhouettes: pickList(entry.silhouettes),
    promptUsed: context.promptUsed,
    modelUsed: context.modelUsed,
    source: 'ai',
    saved: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function fallbackDirection(rawText: string, context: ParseBrainstormContext): CreativeDirection {
  const now = new Date().toISOString()
  return {
    id: generateDirectionId(0),
    briefId: context.briefId,
    title: 'Roher Modelloutput',
    summary: '',
    body: rawText,
    keywords: '',
    palette: '',
    materials: '',
    silhouettes: '',
    promptUsed: context.promptUsed,
    modelUsed: context.modelUsed,
    source: 'ai',
    saved: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function generateDirectionId(index: number) {
  const random = Math.random().toString(36).slice(2, 8)
  return `dir-${Date.now().toString(36)}-${index}-${random}`
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pickList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .join(', ')
  }
  return pickString(value)
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(6, Math.floor(value)))
}

// ---------------------------------------------------------------------------
// Drop concept generator (RHE Creative Lab)
// ---------------------------------------------------------------------------

async function handleDropConcepts(request: Request, env: ApiEnv, origin: string) {
  const body = await readJson<Partial<DropConceptRequest>>(request)
  const theme = typeof body.theme === 'string' ? body.theme.trim() : ''
  const productMode = typeof body.productMode === 'string' ? body.productMode.trim() : ''
  const tone = typeof body.tone === 'string' ? body.tone.trim() : ''
  if (!theme) {
    return errorResponse('invalid_concept_request', 'Theme is required.', 400, origin)
  }
  if (!env.geminiApiKey) {
    return errorResponse('creative_not_configured', 'AI provider is not configured.', 503, origin)
  }

  const prompt = buildDropConceptPrompt({ theme, productMode, tone })
  let providerText: string
  try {
    providerText = await callGeminiForBrainstorm(env, prompt)
  } catch {
    // Always re-label provider failures so the UI sees the concept-specific code, and never
    // leaks the upstream message (which can contain API keys or URLs).
    throw new HttpError(
      'creative_concept_failed',
      'Drop concept provider is temporarily unavailable.',
      502,
    )
  }

  const concepts = parseDropConcepts(providerText)
  const response: DropConceptResponse = { concepts, model: env.geminiTextModel }
  return jsonResponse(response, 200, origin)
}

export function buildDropConceptPrompt(input: { theme: string; productMode: string; tone: string }) {
  return [
    'Du bist Creative Director für eine kuratierte Streetwear/Ready-to-Wear Brand.',
    'Erstelle drei konkrete Drop-Konzepte für moderne, tragbare Mode.',
    `Thema: ${input.theme}.`,
    `Hero-Piece: ${input.productMode || 'Oversized Shirt'}.`,
    `Ton: ${input.tone || 'clean, direct, premium, kein Kitsch'}.`,
    'Jedes Konzept braucht: title, story, heroPiece, palette (Array), printDirection, mockupPrompt, productionNotes (Array).',
    'Die Mockup-Prompts müssen echte Fashion-Mockups erzeugen können: Stoff, Fit, Licht, Print-Platzierung, Kamera, Hintergrund.',
    'Antworte nur als JSON Array.',
  ].join('\n')
}

export function parseDropConcepts(rawText: string): DropConcept[] {
  const trimmed = (rawText ?? '').trim()
  if (!trimmed) return []
  const stripped = stripJsonFences(trimmed)
  const firstBracket = stripped.indexOf('[')
  const lastBracket = stripped.lastIndexOf(']')
  const json = firstBracket >= 0 && lastBracket > firstBracket
    ? stripped.slice(firstBracket, lastBracket + 1)
    : stripped
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }
  const items = Array.isArray(parsed) ? parsed : []
  return items.map((item) => normalizeDropConcept(item))
}

function normalizeDropConcept(value: unknown): DropConcept {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    title: toText(data.title, 'Untitled Drop'),
    story: toText(data.story, ''),
    heroPiece: toText(data.heroPiece, 'Oversized Shirt'),
    palette: toTextArray(data.palette),
    printDirection: toText(data.printDirection, ''),
    mockupPrompt: toText(data.mockupPrompt, ''),
    productionNotes: toTextArray(data.productionNotes),
  }
}
