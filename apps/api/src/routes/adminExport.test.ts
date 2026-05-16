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

function fakeRepo(rows: unknown[] = []) {
  return { list: vi.fn(async () => rows) } as unknown as {
    list: (...args: unknown[]) => Promise<unknown[]>
  }
}

function fullContext(overrides: Partial<ApiContext> = {}): ApiContext {
  const env = authenticatedEnv()
  return {
    env,
    pool: { query: vi.fn(async () => ({ rows: [] })), end: vi.fn() } as unknown as ApiContext['pool'],
    partnersRepository: fakeRepo([{ id: 'partner-1' }]) as unknown as ApiContext['partnersRepository'],
    tasksRepository: fakeRepo() as unknown as ApiContext['tasksRepository'],
    partnerEventsRepository: fakeRepo() as unknown as ApiContext['partnerEventsRepository'],
    partnerEvaluationsRepository: fakeRepo() as unknown as ApiContext['partnerEvaluationsRepository'],
    productionProfilesRepository: fakeRepo() as unknown as ApiContext['productionProfilesRepository'],
    sampleRequestsRepository: fakeRepo() as unknown as ApiContext['sampleRequestsRepository'],
    releasesRepository: fakeRepo() as unknown as ApiContext['releasesRepository'],
    releaseTasksRepository: fakeRepo() as unknown as ApiContext['releaseTasksRepository'],
    releasePartnersRepository: fakeRepo() as unknown as ApiContext['releasePartnersRepository'],
    webOpsItemsRepository: fakeRepo() as unknown as ApiContext['webOpsItemsRepository'],
    creativeBriefsRepository: fakeRepo() as unknown as ApiContext['creativeBriefsRepository'],
    creativeDirectionsRepository: fakeRepo() as unknown as ApiContext['creativeDirectionsRepository'],
    promptTemplatesRepository: fakeRepo() as unknown as ApiContext['promptTemplatesRepository'],
    mockupJobsRepository: fakeRepo() as unknown as ApiContext['mockupJobsRepository'],
    legalNotesRepository: fakeRepo() as unknown as ApiContext['legalNotesRepository'],
    ...overrides,
  }
}

describe('admin export route', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/admin/export'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('returns 503 when any required repository is missing', async () => {
    const context = fullContext({ partnersRepository: undefined })
    const response = await handleRequest(
      new Request('http://localhost/api/admin/export', { headers: authenticatedHeaders(context.env) }),
      context,
    )
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'database_unavailable' } })
  })

  it('returns the full export bundle, version, exportedAt, and a content-disposition header', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/admin/export', { headers: authenticatedHeaders(context.env) }),
      context,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="agorase-export-\d{4}-\d{2}-\d{2}\.json"$/,
    )

    const body = (await response.json()) as Record<string, unknown>
    expect(body.version).toBe('1')
    expect(typeof body.exportedAt).toBe('string')
    expect(body.partners).toEqual([{ id: 'partner-1' }])
    expect(body.tasks).toEqual([])
    expect(body.legalNotes).toEqual([])
    expect(body.errors).toBeUndefined()

    expect(context.partnersRepository?.list).toHaveBeenCalled()
    expect(context.legalNotesRepository?.list).toHaveBeenCalled()
  })

  it('captures per-domain errors and still returns 200 with retrievable data', async () => {
    const context = fullContext({
      tasksRepository: {
        list: vi.fn(async () => {
          throw new Error('tasks blew up')
        }),
      } as unknown as ApiContext['tasksRepository'],
    })

    const response = await handleRequest(
      new Request('http://localhost/api/admin/export', { headers: authenticatedHeaders(context.env) }),
      context,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { tasks: unknown[]; partners: unknown[]; errors?: Record<string, string> }
    expect(body.tasks).toEqual([])
    expect(body.partners).toEqual([{ id: 'partner-1' }])
    expect(body.errors).toEqual({ tasks: 'tasks blew up' })
  })

  it('returns 405 for non-GET methods', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/admin/export', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )
    expect(response.status).toBe(405)
  })
})
