import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Manufactory } from '@agorase/shared'
import { readEnv } from './env.js'
import { buildSessionCookie } from './auth/session.js'
import { handleRequest } from './index.js'
import { buildPartnerResearchPrompt, hasGeminiConfig } from './providers/gemini.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('API server', () => {
  const testPartner: Manufactory = {
    id: 'atelier-forma',
    name: 'Atelier Forma',
    contactPerson: '',
    category: 'Ready-to-Wear',
    city: 'Köln',
    region: 'NRW',
    country: 'Deutschland',
    website: 'https://forma.example',
    email: '',
    phone: '',
    social: '',
    products: 'Overshirts',
    priceLevel: 'Premium',
    brandFit: 'A',
    cooperationPotential: 'Hoch',
    status: 'Recherchiert',
    priority: 'A',
    source: 'Test',
    lastContact: '',
    nextFollowUp: '',
    nextStep: 'Line Sheet prüfen',
    notes: '',
  }

  function fakePartnersRepository(partners: Manufactory[] = []) {
    return {
      list: vi.fn(async () => partners),
      upsert: vi.fn(async (partner: Manufactory) => partner),
      update: vi.fn(async (id: string, patch: Partial<Manufactory>) => ({ ...testPartner, ...patch, id })),
      delete: vi.fn(async () => undefined),
      importMany: vi.fn(async (nextPartners: Manufactory[]) => nextPartners),
    }
  }

  function authenticatedEnv(source: Record<string, string | undefined> = {}) {
    return readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', ...source })
  }

  function authenticatedHeaders(env = authenticatedEnv()) {
    return { cookie: buildSessionCookie(env) }
  }

  it('reports missing Gemini config without exposing secrets', async () => {
    const response = await handleRequest(new Request('http://localhost/api/health'), readEnv({}))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.providers.gemini).toBe('missing_config')
    expect(JSON.stringify(body)).not.toContain('GEMINI_API_KEY')
  })

  it('rejects research calls when Gemini is not configured', async () => {
    const env = authenticatedEnv()
    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      env,
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

  it('reads the database URL from server-only env', () => {
    expect(readEnv({ DATABASE_URL: 'postgresql://example/internal' }).databaseUrl).toBe('postgresql://example/internal')
  })

  it('reads admin auth secrets from server-only env', () => {
    const env = readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', NODE_ENV: 'production' })

    expect(env.adminPassword).toBe('pw')
    expect(env.sessionSecret).toBe('secret')
    expect(env.nodeEnv).toBe('production')
  })

  it('rejects login when auth is not configured', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'pw' }) }),
      readEnv({}),
    )

    expect(response.status).toBe(503)
  })

  it('rejects invalid admin passwords', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'bad' }) }),
      readEnv({ ADMIN_PASSWORD: 'good', SESSION_SECRET: 'secret' }),
    )

    expect(response.status).toBe(401)
  })

  it('sets a session cookie for valid admin login', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'good' }) }),
      readEnv({ ADMIN_PASSWORD: 'good', SESSION_SECRET: 'secret' }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('agorase_session=')
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

  it('includes credential-aware CORS headers', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/health', {
        headers: { origin: 'https://app.agorase.com' },
      }),
      readEnv({ ALLOWED_ORIGINS: 'https://app.agorase.com,http://localhost:5173' }),
    )

    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
    expect(response.headers.get('access-control-allow-methods')).toContain('DELETE')
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

  it('rejects unauthenticated partner API requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/partners'), {
      env: readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }),
      partnersRepository: fakePartnersRepository(),
    })

    expect(response.status).toBe(401)
  })

  it('allows authenticated partner API requests', async () => {
    const login = await handleRequest(
      new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'pw' }) }),
      readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }),
    )
    const response = await handleRequest(
      new Request('http://localhost/api/partners', { headers: { cookie: login.headers.get('set-cookie') ?? '' } }),
      { env: readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }), partnersRepository: fakePartnersRepository() },
    )

    expect(response.status).toBe(200)
  })

  it('rejects oversized JSON requests before provider calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const env = authenticatedEnv({ GEMINI_API_KEY: 'test-key' })
    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        headers: { 'content-length': '100001', ...authenticatedHeaders(env) },
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      env,
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'request_too_large', message: 'Request body is too large.' },
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends Gemini API keys in headers instead of query strings', async () => {
    const env = authenticatedEnv({ GEMINI_API_KEY: 'test-secret' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"suggestions":[]}' }] } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      env,
    )

    expect(response.status).toBe(200)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).not.toContain('key=')
    expect(String(url)).not.toContain('test-secret')
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-secret')
  })

  it('accepts trailing slash research requests', async () => {
    const env = authenticatedEnv({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"suggestions":[]}' }] } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/research/partners/', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      env,
    )

    expect(response.status).toBe(200)
  })

  it('hides provider error details from frontend responses', async () => {
    const env = authenticatedEnv({ GEMINI_API_KEY: 'test-secret' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'raw provider secret failure' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' }),
      }),
      env,
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      error: { code: 'provider_unavailable', message: 'Partner research provider is temporarily unavailable.' },
    })
    expect(JSON.stringify(body)).not.toContain('raw provider secret failure')
  })

  it('lists partners from the repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const partnersRepository = fakePartnersRepository([testPartner])
    const response = await handleRequest(new Request('http://localhost/api/partners', { headers: authenticatedHeaders(env) }), {
      env,
      partnersRepository,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ partners: [testPartner] })
    expect(partnersRepository.list).toHaveBeenCalled()
  })

  it('saves one partner through the repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const partnersRepository = fakePartnersRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partners', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify(testPartner),
      }),
      {
        env,
        partnersRepository,
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ partner: testPartner })
    expect(partnersRepository.upsert).toHaveBeenCalledWith(testPartner)
  })

  it('updates one partner through the repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const partnersRepository = fakePartnersRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partners/atelier-forma', {
        method: 'PUT',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ status: 'Antwort erhalten' }),
      }),
      {
        env,
        partnersRepository,
      },
    )

    expect(response.status).toBe(200)
    expect(partnersRepository.update).toHaveBeenCalledWith('atelier-forma', { status: 'Antwort erhalten' })
  })

  it('deletes one partner through the repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const partnersRepository = fakePartnersRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partners/atelier-forma', { method: 'DELETE', headers: authenticatedHeaders(env) }),
      {
        env,
        partnersRepository,
      },
    )

    expect(response.status).toBe(204)
    expect(partnersRepository.delete).toHaveBeenCalledWith('atelier-forma')
  })

  it('imports partners through the repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const partnersRepository = fakePartnersRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partners/import', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ partners: [testPartner] }),
      }),
      {
        env,
        partnersRepository,
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ partners: [testPartner] })
    expect(partnersRepository.importMany).toHaveBeenCalledWith([testPartner])
  })

  it('returns a normalized database error when partners are requested without a repository', async () => {
    const env = authenticatedEnv({ DATABASE_URL: 'postgresql://example/internal' })
    const response = await handleRequest(
      new Request('http://localhost/api/partners', { headers: authenticatedHeaders(env) }),
      env,
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'database_unavailable', message: 'Database is not configured.' },
    })
  })
})
