import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CreativeBrief,
  CreativeDirection,
  PromptTemplate,
} from '@agorase/shared'
import { readEnv } from '../env.js'
import { buildSessionCookie } from '../auth/session.js'
import { handleRequest } from '../index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const sampleBrief: CreativeBrief = {
  id: 'brief-1',
  title: 'Capsule SS27',
  goal: 'A poetic capsule',
  audience: 'Discerning early adopters',
  tone: 'Quiet',
  references: 'Margiela archives',
  season: 'SS27',
  releaseId: 'drop-1',
  status: 'exploring',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const sampleDirection: CreativeDirection = {
  id: 'dir-1',
  briefId: 'brief-1',
  title: 'Quiet Knits',
  summary: 'Soft layered knits',
  body: '',
  keywords: 'knit, layered',
  palette: 'bone, fog',
  materials: 'merino',
  silhouettes: 'oversized cardigan',
  promptUsed: '',
  modelUsed: '',
  source: 'manual',
  saved: true,
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const sampleTemplate: PromptTemplate = {
  id: 'tmpl-1',
  name: 'Capsule Brainstorm',
  description: '',
  category: 'capsule',
  body: 'Think in capsule terms.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

function authenticatedEnv(source: Record<string, string | undefined> = {}) {
  return readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', ...source })
}

function authenticatedHeaders(env = authenticatedEnv()) {
  return { cookie: buildSessionCookie(env) }
}

function fakeBriefsRepository(briefs: CreativeBrief[] = [sampleBrief]) {
  return {
    list: vi.fn(async () => briefs),
    get: vi.fn(async (id: string) => briefs.find((b) => b.id === id) ?? null),
    upsert: vi.fn(async (brief: CreativeBrief) => brief),
    delete: vi.fn(async () => undefined),
  }
}

function fakeDirectionsRepository(directions: CreativeDirection[] = [sampleDirection]) {
  return {
    list: vi.fn(async () => directions),
    get: vi.fn(async (id: string) => directions.find((d) => d.id === id) ?? null),
    upsert: vi.fn(async (direction: CreativeDirection) => direction),
    delete: vi.fn(async () => undefined),
  }
}

function fakeTemplatesRepository(templates: PromptTemplate[] = [sampleTemplate]) {
  return {
    list: vi.fn(async () => templates),
    get: vi.fn(async (id: string) => templates.find((t) => t.id === id) ?? null),
    upsert: vi.fn(async (template: PromptTemplate) => template),
    delete: vi.fn(async () => undefined),
  }
}

function fullContext(envSource: Record<string, string | undefined> = {}) {
  return {
    env: authenticatedEnv(envSource),
    creativeBriefsRepository: fakeBriefsRepository(),
    creativeDirectionsRepository: fakeDirectionsRepository(),
    promptTemplatesRepository: fakeTemplatesRepository(),
  }
}

describe('creative routes', () => {
  it('rejects unauthenticated brief requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/creative/briefs'), fullContext())
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated direction requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/creative/directions'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated prompt template requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/creative/prompt-templates'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated brainstorm requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      }),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('lists creative briefs with status and release filters', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/briefs?status=exploring&release=drop-1', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ briefs: [sampleBrief] })
    expect(context.creativeBriefsRepository.list).toHaveBeenCalledWith({
      status: 'exploring',
      releaseId: 'drop-1',
    })
  })

  it('creates a creative brief through the repository', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/briefs', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify(sampleBrief),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ brief: sampleBrief })
    expect(context.creativeBriefsRepository.upsert).toHaveBeenCalledWith(sampleBrief)
  })

  it('updates a creative brief by id with PUT', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/briefs/brief-1', {
        method: 'PUT',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ ...sampleBrief, id: 'ignored' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(context.creativeBriefsRepository.upsert).toHaveBeenCalledWith({
      ...sampleBrief,
      id: 'brief-1',
    })
  })

  it('deletes a creative brief by id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/briefs/brief-1', {
        method: 'DELETE',
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(204)
    expect(context.creativeBriefsRepository.delete).toHaveBeenCalledWith('brief-1')
  })

  it('lists creative directions filtered by brief', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/directions?brief=brief-1', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ directions: [sampleDirection] })
    expect(context.creativeDirectionsRepository.list).toHaveBeenCalledWith({ briefId: 'brief-1' })
  })

  it('saves a creative direction through the repository', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/directions', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify(sampleDirection),
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(context.creativeDirectionsRepository.upsert).toHaveBeenCalledWith(sampleDirection)
  })

  it('lists and saves prompt templates', async () => {
    const context = fullContext()
    const listResponse = await handleRequest(
      new Request('http://localhost/api/creative/prompt-templates', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )
    expect(listResponse.status).toBe(200)
    await expect(listResponse.json()).resolves.toEqual({ templates: [sampleTemplate] })

    const saveResponse = await handleRequest(
      new Request('http://localhost/api/creative/prompt-templates', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify(sampleTemplate),
      }),
      context,
    )
    expect(saveResponse.status).toBe(200)
    expect(context.promptTemplatesRepository.upsert).toHaveBeenCalledWith(sampleTemplate)
  })

  it('rejects brainstorm requests without a prompt', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-key' })
    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: '   ' }),
      }),
      context,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_brainstorm_request' },
    })
  })

  it('returns 503 when GEMINI_API_KEY is missing', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule for SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(503)
    const body = await response.text()
    expect(body).not.toContain('GEMINI_API_KEY')
    expect(body).not.toContain('x-goog-api-key')
  })

  it('runs a successful brainstorm without leaking secrets', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const aiPayload = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text:
                  '```json\n' +
                  '[{"title":"Quiet Knits","summary":"Layered.","body":"b","keywords":["knit","quiet"],"palette":["bone","fog"],"materials":["merino"],"silhouettes":["oversized"]}]\n' +
                  '```',
              },
            ],
          },
        },
      ],
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(aiPayload, { status: 200, headers: { 'content-type': 'application/json' } }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27', count: 1, brief_id: 'brief-1' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      directions: Array<{ title: string; source: string; briefId: string; saved: boolean; keywords: string }>
      model: string
    }
    expect(body.directions).toHaveLength(1)
    expect(body.directions[0]).toMatchObject({
      title: 'Quiet Knits',
      source: 'ai',
      briefId: 'brief-1',
      saved: false,
      keywords: 'knit, quiet',
    })
    expect(body.model).toBe(context.env.geminiTextModel)

    const stringified = JSON.stringify(body)
    expect(stringified).not.toContain('test-secret')
    expect(stringified).not.toContain('x-goog-api-key')
    expect(stringified).not.toContain('GEMINI_API_KEY')
    expect(stringified).not.toContain('AIza')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).not.toContain('test-secret')
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-secret')
  })

  it('falls back to a single raw direction when the model returns malformed JSON', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'this is not valid json at all' }] } }],
        }),
        { status: 200 },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { directions: Array<{ title: string; body: string }> }
    expect(body.directions).toHaveLength(1)
    expect(body.directions[0]).toMatchObject({
      title: 'Roher Modelloutput',
      body: 'this is not valid json at all',
    })
  })

  it('returns an empty directions list when the model returns no text', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ directions: [] })
  })

  it('sanitizes provider 500s to 502 brainstorm_failed without leaking upstream details', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'raw upstream secret: AIzaFAKE / endpoint googleapis.com' } }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(502)
    const text = await response.text()
    expect(text).toContain('brainstorm_failed')
    expect(text).not.toContain('AIzaFAKE')
    expect(text).not.toContain('googleapis.com')
    expect(text).not.toContain('x-goog-api-key')
    expect(text).not.toContain('test-secret')
  })

  it('uses prompt template body when template_id resolves', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }), { status: 200 }),
    )

    await handleRequest(
      new Request('http://localhost/api/creative/brainstorm', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27', template_id: 'tmpl-1' }),
      }),
      context,
    )

    const init = fetchSpy.mock.calls[0][1]
    const sentBody = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>
    }
    const sentPrompt = sentBody.contents[0].parts[0].text
    expect(sentPrompt).toContain('Think in capsule terms.')
    expect(sentPrompt).toContain('capsule SS27')
    expect(context.promptTemplatesRepository.get).toHaveBeenCalledWith('tmpl-1')
  })
})
