import { afterEach, describe, expect, it, vi } from 'vitest'
import { readEnv } from '../env.js'
import { buildSessionCookie } from '../auth/session.js'
import { handleRequest, type ApiContext } from '../index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

function authenticatedEnv(source: Record<string, string | undefined> = {}) {
  return readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', ...source })
}

function authenticatedHeaders(env = authenticatedEnv()) {
  return { cookie: buildSessionCookie(env) }
}

function buildContext(overrides: Partial<ApiContext> = {}): ApiContext {
  const env =
    overrides.env ??
    authenticatedEnv({
      GEMINI_API_KEY: 'k',
      GEMINI_TEXT_MODEL: 'gemini-text-test',
      GEMINI_IMAGE_MODEL: 'gemini-image-test',
      ALLOWED_ORIGINS: 'http://a.test,http://b.test',
      DATABASE_URL: 'postgres://example/db',
      NODE_ENV: 'test',
    })
  return {
    env,
    pool: { query: vi.fn(async () => ({ rows: [{ '?column?': 1 }] })), end: vi.fn() } as unknown as ApiContext['pool'],
    ...overrides,
  }
}

describe('admin diagnostics route', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics'),
      buildContext(),
    )
    expect(response.status).toBe(401)
  })

  it('reports providers and database as ready when configured and pool responds', async () => {
    const context = buildContext()
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', { headers: authenticatedHeaders(context.env) }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, Record<string, unknown>>
    expect(body.providers).toEqual({
      geminiText: 'ready',
      geminiImage: 'ready',
      database: 'ready',
    })
    expect(body.env).toEqual({
      geminiTextModel: 'gemini-text-test',
      geminiImageModel: 'gemini-image-test',
      allowedOriginsCount: 2,
    })
    expect(body.deployment).toEqual({ nodeEnv: 'test' })
    expect(typeof body.checkedAt).toBe('string')

    expect(context.pool?.query).toHaveBeenCalledWith('SELECT 1')
  })

  it('reports providers as not_configured when api key missing', async () => {
    const env = authenticatedEnv({
      GEMINI_API_KEY: '',
      GOOGLE_API_KEY: '',
      ALLOWED_ORIGINS: 'http://a.test',
    })
    const context = buildContext({ env })
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', { headers: authenticatedHeaders(env) }),
      context,
    )

    const body = (await response.json()) as { providers: Record<string, string> }
    expect(body.providers.geminiText).toBe('not_configured')
    expect(body.providers.geminiImage).toBe('not_configured')
  })

  it('reports database unavailable when pool ping throws', async () => {
    const context = buildContext({
      pool: {
        query: vi.fn(async () => {
          throw new Error('connection refused')
        }),
        end: vi.fn(),
      } as unknown as ApiContext['pool'],
    })
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', { headers: authenticatedHeaders(context.env) }),
      context,
    )
    const body = (await response.json()) as { providers: Record<string, string> }
    expect(body.providers.database).toBe('unavailable')
  })

  it('reports database unavailable when pool not wired', async () => {
    const context = buildContext({ pool: undefined })
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', { headers: authenticatedHeaders(context.env) }),
      context,
    )
    const body = (await response.json()) as { providers: Record<string, string> }
    expect(body.providers.database).toBe('unavailable')
  })

  it('does not echo any secret env values in the response', async () => {
    const env = authenticatedEnv({
      GEMINI_API_KEY: 'super-secret-key-AIzaXXXX',
      DATABASE_URL: 'postgres://user:pwd@host/db',
      ADMIN_PASSWORD: 'admin-pw-not-leaked',
      SESSION_SECRET: 'session-not-leaked',
      ALLOWED_ORIGINS: 'https://example.invalid,https://other.invalid',
    })
    const context = buildContext({ env })
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', { headers: authenticatedHeaders(env) }),
      context,
    )

    const text = await response.text()
    expect(text).not.toContain('super-secret-key-AIzaXXXX')
    expect(text).not.toContain('postgres://user:pwd@host/db')
    expect(text).not.toContain('admin-pw-not-leaked')
    expect(text).not.toContain('session-not-leaked')
    expect(text).not.toContain('example.invalid')
    expect(text).not.toContain('other.invalid')
  })

  it('returns 405 for non-GET methods', async () => {
    const context = buildContext()
    const response = await handleRequest(
      new Request('http://localhost/api/admin/diagnostics', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )
    expect(response.status).toBe(405)
  })
})
