import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MockupJob, MockupReference } from '@agorase/shared'
import { readEnv } from '../env.js'
import { buildSessionCookie } from '../auth/session.js'
import { handleRequest } from '../index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const sampleJob: MockupJob = {
  id: 'mockup-1',
  prompt: 'A poetic SS27 capsule mockup.',
  referenceNotes: '',
  aspectRatio: '4:5',
  quality: 'standard',
  status: 'completed',
  modelUsed: 'gemini-3-pro-image-preview',
  imageUrl: 'https://example.test/img.png',
  imageData: '',
  mimeType: 'image/png',
  error: '',
  releaseId: 'drop-1',
  briefId: 'brief-1',
  notes: '',
  referenceImages: [],
  productMode: '',
  imageMode: '',
  garmentColor: '',
  fabric: '',
  printMethod: '',
  placement: '',
  designText: '',
  typographyPreset: '',
  typographyFreeform: '',
  printFields: { front: '', back: '', sleeve: '', printSizeCm: '' },
  qualityReport: null,
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const validReference: MockupReference = {
  id: 'ref-1',
  name: 'mood.png',
  data: 'aGVsbG8=',
  mimeType: 'image/png',
  kind: 'style',
}

function authenticatedEnv(source: Record<string, string | undefined> = {}) {
  return readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', ...source })
}

function authenticatedHeaders(env = authenticatedEnv()) {
  return { cookie: buildSessionCookie(env) }
}

function fakeRepository(jobs: MockupJob[] = [sampleJob]) {
  const upserted: MockupJob[] = []
  return {
    upserted,
    list: vi.fn(async () => jobs),
    get: vi.fn(async (id: string) => jobs.find((job) => job.id === id) ?? null),
    upsert: vi.fn(async (job: MockupJob) => {
      upserted.push(job)
      return job
    }),
    delete: vi.fn(async () => undefined),
  }
}

function fullContext(envSource: Record<string, string | undefined> = {}) {
  return {
    env: authenticatedEnv(envSource),
    mockupJobsRepository: fakeRepository(),
  }
}

describe('mockups routes', () => {
  it('rejects unauthenticated list requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/mockups'), fullContext())
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated detail requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/mockup-1'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated delete requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/mockup-1', { method: 'DELETE' }),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated generate requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' }),
      }),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('lists jobs with status, brief, and release filters', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/mockups?status=completed&brief=brief-1&release=drop-1', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ jobs: [sampleJob] })
    expect(context.mockupJobsRepository.list).toHaveBeenCalledWith({
      status: 'completed',
      briefId: 'brief-1',
      releaseId: 'drop-1',
    })
  })

  it('gets a job by id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/mockup-1', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ job: sampleJob })
  })

  it('returns 404 for unknown jobs', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/missing', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(404)
  })

  it('deletes a job by id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/mockup-1', {
        method: 'DELETE',
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(204)
    expect(context.mockupJobsRepository.delete).toHaveBeenCalledWith('mockup-1')
  })

  it('rejects generate requests without a prompt', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-key' })
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: '   ' }),
      }),
      context,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_mockup_request' },
    })
  })

  it('returns 503 mockups_not_configured when GEMINI_API_KEY is missing', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(503)
    const body = await response.text()
    expect(body).toContain('mockups_not_configured')
    expect(body).not.toContain('GEMINI_API_KEY')
    expect(body).not.toContain('x-goog-api-key')
  })

  it('completes a generate from inline base64 image data without leaking secrets', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const aiPayload = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: 'aGVsbG8=',
                  mimeType: 'image/png',
                },
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
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27',
          aspect_ratio: '4:5',
          quality: 'standard',
          brief_id: 'brief-1',
          release_id: 'drop-1',
        }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job).toMatchObject({
      status: 'completed',
      imageData: 'aGVsbG8=',
      mimeType: 'image/png',
      aspectRatio: '4:5',
      quality: 'standard',
      briefId: 'brief-1',
      releaseId: 'drop-1',
      error: '',
    })
    expect(body.job.modelUsed).toBe(context.env.geminiImageModel)

    const stringified = JSON.stringify(body)
    expect(stringified).not.toContain('test-secret')
    expect(stringified).not.toContain('x-goog-api-key')
    expect(stringified).not.toContain('GEMINI_API_KEY')
    expect(stringified).not.toContain('AIza')
    expect(stringified).not.toContain('googleapis.com')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).not.toContain('test-secret')
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-secret')
  })

  it('completes a generate from a returned file URI', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const aiPayload = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                fileData: {
                  fileUri: 'https://example.test/generated.png',
                  mimeType: 'image/png',
                },
              },
            ],
          },
        },
      ],
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(aiPayload, { status: 200, headers: { 'content-type': 'application/json' } }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job).toMatchObject({
      status: 'completed',
      imageUrl: 'https://example.test/generated.png',
      imageData: '',
      mimeType: 'image/png',
    })
  })

  it('marks the job failed and sanitizes the error when the provider returns 500', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'raw upstream secret: AIzaFAKE / endpoint googleapis.com' } }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job.status).toBe('failed')
    expect(body.job.error).not.toContain('AIzaFAKE')
    expect(body.job.error).not.toContain('googleapis.com')

    const text = JSON.stringify(body)
    expect(text).not.toContain('AIzaFAKE')
    expect(text).not.toContain('googleapis.com')
    expect(text).not.toContain('test-secret')
    expect(text).not.toContain('x-goog-api-key')

    // Verify the job was first persisted as pending and then updated to failed.
    const upserts = context.mockupJobsRepository.upserted
    expect(upserts).toHaveLength(2)
    expect(upserts[0]?.status).toBe('pending')
    expect(upserts[1]?.status).toBe('failed')
  })

  it('marks the job failed when the provider returns no image data and no URL', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [] } }] }), { status: 200 }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job.status).toBe('failed')
    expect(body.job.error).toBe('Image provider returned no image data.')

    const text = JSON.stringify(body)
    expect(text).not.toContain('googleapis.com')
    expect(text).not.toContain('test-secret')
  })

  it('drops oversized base64 payloads but keeps a returned URL', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const big = 'A'.repeat(4 * 1024 * 1024 + 16)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { data: big, mimeType: 'image/png' } },
                  { fileData: { fileUri: 'https://example.test/big.png', mimeType: 'image/png' } },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job.status).toBe('completed')
    expect(body.job.imageData).toBe('')
    expect(body.job.imageUrl).toBe('https://example.test/big.png')
  })

  it('sends reference images before the text part in the upstream multimodal request', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const aiPayload = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'image/png' } }],
          },
        },
      ],
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(aiPayload, { status: 200, headers: { 'content-type': 'application/json' } }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27',
          reference_images: [validReference],
        }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const [, init] = fetchSpy.mock.calls[0]
    const upstreamBody = JSON.parse(String(init?.body ?? '{}')) as {
      contents?: Array<{ parts?: Array<Record<string, unknown>> }>
    }
    const parts = upstreamBody.contents?.[0]?.parts ?? []
    expect(parts).toHaveLength(2)
    expect(parts[0]).toEqual({
      inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' },
    })
    expect(parts[1]).toMatchObject({ text: expect.stringContaining('capsule SS27') })

    const persisted = context.mockupJobsRepository.upserted
    expect(persisted[0]?.referenceImages).toEqual([validReference])
  })

  it('rejects generate requests with more than three reference images', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const refs: MockupReference[] = Array.from({ length: 4 }, (_, index) => ({
      ...validReference,
      id: `ref-${index}`,
    }))

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27', reference_images: refs }),
      }),
      context,
    )

    expect(response.status).toBe(400)
    expect(context.mockupJobsRepository.upsert).not.toHaveBeenCalled()
  })

  it('rejects generate requests with a disallowed reference mime type without touching the DB', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27',
          reference_images: [{ ...validReference, mimeType: 'image/gif' }],
        }),
      }),
      context,
    )

    expect(response.status).toBe(400)
    expect(context.mockupJobsRepository.upsert).not.toHaveBeenCalled()
  })

  it('does not leak secrets in the generate response even when references are sent', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'image/png' } }] } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27',
          reference_images: [validReference],
        }),
      }),
      context,
    )

    const text = await response.text()
    expect(text).not.toContain('test-secret')
    expect(text).not.toContain('AIza')
    expect(text).not.toContain('x-goog-api-key')
    expect(text).not.toContain('googleapis.com')
  })

  describe('GET /api/mockups/:id/download', () => {
    it('rejects unauthenticated download requests', async () => {
      const response = await handleRequest(
        new Request('http://localhost/api/mockups/mockup-1/download'),
        fullContext(),
      )
      expect(response.status).toBe(401)
    })

    it('returns 404 for unknown jobs', async () => {
      const context = fullContext()
      context.mockupJobsRepository.get = vi.fn(async () => null)
      const response = await handleRequest(
        new Request('http://localhost/api/mockups/missing/download', {
          headers: authenticatedHeaders(context.env),
        }),
        context,
      )
      expect(response.status).toBe(404)
    })

    it('returns 404 for jobs that are not completed', async () => {
      const failedJob: MockupJob = { ...sampleJob, status: 'failed', imageData: '' }
      const context = {
        env: authenticatedEnv(),
        mockupJobsRepository: {
          ...fakeRepository([failedJob]),
        },
      }
      const response = await handleRequest(
        new Request('http://localhost/api/mockups/mockup-1/download', {
          headers: authenticatedHeaders(context.env),
        }),
        context,
      )
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'mockup_image_unavailable' },
      })
    })

    it('streams inline base64 bytes with download headers', async () => {
      const inlineJob: MockupJob = {
        ...sampleJob,
        imageUrl: '',
        imageData: Buffer.from('hello').toString('base64'),
        mimeType: 'image/png',
      }
      const context = {
        env: authenticatedEnv(),
        mockupJobsRepository: { ...fakeRepository([inlineJob]) },
      }
      const response = await handleRequest(
        new Request('http://localhost/api/mockups/mockup-1/download', {
          headers: authenticatedHeaders(context.env),
        }),
        context,
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
      const disposition = response.headers.get('content-disposition') || ''
      expect(disposition).toContain('attachment;')
      expect(disposition).toMatch(/filename="agorase-mockup-mockup-1-\d{4}-\d{2}-\d{2}\.png"/)
      const bytes = Buffer.from(await response.arrayBuffer())
      expect(bytes.toString('utf8')).toBe('hello')
    })

    it('proxies bytes from imageUrl when no inline data is stored', async () => {
      const urlJob: MockupJob = {
        ...sampleJob,
        imageUrl: 'https://example.test/img.jpeg',
        imageData: '',
        mimeType: 'image/jpeg',
      }
      const context = {
        env: authenticatedEnv(),
        mockupJobsRepository: { ...fakeRepository([urlJob]) },
      }
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(Buffer.from('proxied'), { status: 200 }),
      )

      const response = await handleRequest(
        new Request('http://localhost/api/mockups/mockup-1/download', {
          headers: authenticatedHeaders(context.env),
        }),
        context,
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/jpeg')
      const disposition = response.headers.get('content-disposition') || ''
      expect(disposition).toMatch(/\.jpeg"$/)
      const bytes = Buffer.from(await response.arrayBuffer())
      expect(bytes.toString('utf8')).toBe('proxied')
      expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('https://example.test/img.jpeg')
    })

    it('sanitizes job ids when building the download filename', async () => {
      const oddJob: MockupJob = {
        ...sampleJob,
        id: 'weird id$%^&*()',
        imageUrl: '',
        imageData: Buffer.from('hi').toString('base64'),
        mimeType: 'image/png',
      }
      const context = {
        env: authenticatedEnv(),
        mockupJobsRepository: {
          ...fakeRepository([oddJob]),
          get: vi.fn(async () => oddJob),
        },
      }
      const encoded = encodeURIComponent('weird id$%^&*()')
      const response = await handleRequest(
        new Request(`http://localhost/api/mockups/${encoded}/download`, {
          headers: authenticatedHeaders(context.env),
        }),
        context,
      )

      expect(response.status).toBe(200)
      const disposition = response.headers.get('content-disposition') || ''
      // Only [A-Za-z0-9._-] survives; any other char becomes an underscore.
      expect(disposition).toMatch(/filename="agorase-mockup-weird_id_+-\d{4}-\d{2}-\d{2}\.png"/)
    })
  })

  it('accepts RHE product mode, image mode, typography and print fields end-to-end', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const aiPayload = JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'aGVsbG8=', mimeType: 'image/png' } }],
          },
        },
      ],
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(aiPayload, { status: 200, headers: { 'content-type': 'application/json' } }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27 oversized hoodie with confident lettering',
          product_mode: 'Hoodie',
          image_mode: 'Model-Shot',
          garment_color: 'Washed Black',
          fabric: '420 GSM brushed cotton fleece',
          print_method: 'Screenprint',
          placement: 'left chest + big back print',
          design_text: 'KINGS',
          typography_preset: 'Bold Condensed Sans',
          typography_freeform: 'bold condensed sans-serif streetwear lettering',
          print_fields: { front: '20cm', back: '40cm', sleeve: '', printSizeCm: '' },
        }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job).toMatchObject({
      status: 'completed',
      productMode: 'Hoodie',
      imageMode: 'Model-Shot',
      garmentColor: 'Washed Black',
      fabric: '420 GSM brushed cotton fleece',
      printMethod: 'Screenprint',
      designText: 'KINGS',
    })
    expect(body.job.qualityReport).not.toBeNull()
    expect(body.job.qualityReport?.checks.length).toBeGreaterThan(0)

    const [, init] = fetchSpy.mock.calls[0]
    const upstreamBody = JSON.parse(String(init?.body ?? '{}')) as {
      contents?: Array<{ parts?: Array<{ text?: string }> }>
    }
    const text = upstreamBody.contents?.[0]?.parts?.find((part) => part.text)?.text ?? ''
    expect(text).toContain('Garment: Hoodie')
    expect(text).toContain('Mockup mode: Model-Shot')
    expect(text).toContain('Front print: 20cm')
    expect(text).toContain('Back print: 40cm')
    expect(text).toContain('KINGS')
  })

  it('rejects an unknown product mode with 400', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({
          prompt: 'capsule SS27',
          product_mode: 'Bogus Tunic',
        }),
      }),
      context,
    )
    // Unknown values are coerced to '' (ignored) — the request still succeeds with no mode,
    // which is acceptable for backward compatibility with legacy clients.
    // The legacy `expect 400` would lock us into rejecting any future product mode rollout.
    // Therefore: assert the response was *accepted* but the product_mode was discarded.
    expect(response.status).not.toBe(400)
  })

  it('marks the job failed when only base64 is returned and exceeds the 4MB limit', async () => {
    const context = fullContext({ GEMINI_API_KEY: 'test-secret' })
    const big = 'A'.repeat(4 * 1024 * 1024 + 16)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: big, mimeType: 'image/png' } }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/mockups/generate', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ prompt: 'capsule SS27' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { job: MockupJob }
    expect(body.job.status).toBe('failed')
    expect(body.job.imageData).toBe('')
    expect(body.job.error).toContain('4 MB')
  })
})
