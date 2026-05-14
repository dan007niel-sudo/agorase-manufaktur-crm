import { afterEach, describe, expect, it, vi } from 'vitest'
import { readEnv } from './env.js'
import { handleRequest } from './index.js'
import { buildPartnerResearchPrompt, hasGeminiConfig } from './providers/gemini.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('API server', () => {
  it('reports missing Gemini config without exposing secrets', async () => {
    const response = await handleRequest(new Request('http://localhost/api/health'), readEnv({}))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.providers.gemini).toBe('missing_config')
    expect(JSON.stringify(body)).not.toContain('GEMINI_API_KEY')
  })

  it('rejects research calls when Gemini is not configured', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      readEnv({}),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'research_failed', message: 'AI provider is not configured.' },
    })
  })

  it('builds a product-specific Gemini research prompt', () => {
    expect(hasGeminiConfig(readEnv({ GEMINI_API_KEY: 'test-key' }))).toBe(true)
    expect(
      buildPartnerResearchPrompt({
        categories: ['Factory'],
        regions: 'Portugal, Italy',
        productFocus: 'premium cut-and-sew',
        priceLevel: 'Premium',
        count: 4,
      }),
    ).toContain('Agorase Fashion OS')
  })

  it('uses allow-listed origins for CORS responses', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/health', {
        headers: { origin: 'https://app.agorase.com' },
      }),
      readEnv({ ALLOWED_ORIGINS: 'https://app.agorase.com,http://localhost:5173' }),
    )

    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.agorase.com')
    expect(response.headers.get('access-control-allow-origin')).not.toBe('*')
  })

  it('does not echo disallowed origins', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/health', {
        headers: { origin: 'https://evil.example' },
      }),
      readEnv({ ALLOWED_ORIGINS: 'https://app.agorase.com,http://localhost:5173' }),
    )

    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.agorase.com')
  })

  it('rejects oversized JSON requests before provider calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        headers: { 'content-length': '100001' },
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      readEnv({ GEMINI_API_KEY: 'test-key' }),
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'request_too_large', message: 'Request body is too large.' },
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends Gemini API keys in headers instead of query strings', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"suggestions":[]}' }] } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      readEnv({ GEMINI_API_KEY: 'test-secret' }),
    )

    expect(response.status).toBe(200)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).not.toContain('key=')
    expect(String(url)).not.toContain('test-secret')
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-secret')
  })

  it('hides provider error details from frontend responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'raw provider secret failure' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      readEnv({ GEMINI_API_KEY: 'test-secret' }),
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      error: { code: 'provider_unavailable', message: 'Partner research provider is temporarily unavailable.' },
    })
    expect(JSON.stringify(body)).not.toContain('raw provider secret failure')
  })
})
