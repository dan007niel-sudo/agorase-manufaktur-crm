import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  Manufactory,
  OperationalTask,
  PartnerEvaluation,
  PartnerEvent,
  ProductionProfile,
  FashionRelease,
  ReleasePartnerLink,
  ReleaseTask,
  SampleRequest,
  WebOpsItem,
} from '@agorase/shared'
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

  const testTask: OperationalTask = {
    id: 'atelier-forma-task',
    title: 'Line Sheet prüfen',
    section: 'Command Center',
    status: 'open',
    priority: 'high',
    partnerId: 'atelier-forma',
    dueDate: '2026-05-15',
    notes: '',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testEvent: PartnerEvent = {
    id: 'evt-1',
    partnerId: 'atelier-forma',
    type: 'call',
    title: 'Intro call',
    body: 'Discussed samples.',
    eventDate: '2026-05-15',
    nextAction: 'Send brief',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testEvaluation: PartnerEvaluation = {
    id: 'eval-1',
    partnerId: 'atelier-forma',
    fitScore: 5,
    qualityScore: 4,
    termsScore: 3,
    riskScore: 2,
    readinessScore: 4,
    summary: 'Strong partner.',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testProductionProfile: ProductionProfile = {
    partnerId: 'atelier-forma',
    capabilities: 'Cut and sew',
    materials: 'Cotton',
    moq: '50 units',
    leadTime: '6 weeks',
    certifications: 'GOTS',
    costNotes: 'Sample 120 EUR',
    qualityNotes: 'Clean finishing',
    readinessStatus: 'blocked',
    readinessScore: 45,
    blocker: 'Waiting for sample',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testSample: SampleRequest = {
    id: 'sample-1',
    partnerId: 'atelier-forma',
    title: 'Overshirt sample',
    status: 'requested',
    requestedAt: '2026-05-15',
    targetDate: '2026-06-01',
    costEstimate: '120 EUR',
    notes: 'Use black twill.',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testRelease: FashionRelease = {
    id: 'drop-1',
    name: 'Drop 1',
    season: 'SS27',
    launchDate: '2026-07-01',
    status: 'planning',
    summary: 'First capsule.',
    contentStatus: 'drafting',
    readinessNotes: 'Need samples.',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testReleaseTask: ReleaseTask = {
    id: 'release-task-1',
    releaseId: 'drop-1',
    title: 'Finalize line sheet',
    status: 'open',
    owner: 'Daniel',
    dueDate: '2026-06-01',
    notes: '',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  }

  const testReleasePartnerLink: ReleasePartnerLink = {
    releaseId: 'drop-1',
    partnerId: 'atelier-forma',
    role: 'Production',
    createdAt: '2026-05-15T00:00:00.000Z',
  }

  const testWebOpsItem: WebOpsItem = {
    id: 'web-ops-1',
    releaseId: 'drop-1',
    title: 'Launch landing page',
    kind: 'page-brief',
    status: 'in-progress',
    summary: 'Hero, story, CTA.',
    body: 'Long brief body.',
    targetUrl: '/drop-1',
    seoTitle: 'Drop 1 — Agorase',
    seoDescription: 'First capsule.',
    seoKeywords: 'agorase, drop 1',
    checklist: [{ id: 'c1', label: 'Hero copy', done: true }],
    assignee: 'Daniel',
    dueDate: '2026-06-15',
    notes: '',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
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

  function fakeTasksRepository(tasks: OperationalTask[] = [testTask]) {
    return {
      list: vi.fn(async () => tasks),
      upsert: vi.fn(async (task: OperationalTask) => task),
      update: vi.fn(async (id: string, patch: Partial<OperationalTask>) => ({ ...testTask, ...patch, id })),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakePartnerEventsRepository(events: PartnerEvent[] = [testEvent]) {
    return {
      list: vi.fn(async () => events),
      upsert: vi.fn(async (event: PartnerEvent) => event),
      update: vi.fn(async (id: string, patch: Partial<PartnerEvent>) => ({ ...testEvent, ...patch, id })),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakePartnerEvaluationsRepository(evaluations: PartnerEvaluation[] = [testEvaluation]) {
    return {
      list: vi.fn(async () => evaluations),
      upsert: vi.fn(async (evaluation: PartnerEvaluation) => evaluation),
      update: vi.fn(async (id: string, patch: Partial<PartnerEvaluation>) => ({ ...testEvaluation, ...patch, id })),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakeProductionProfilesRepository(profiles: ProductionProfile[] = [testProductionProfile]) {
    return {
      list: vi.fn(async () => profiles),
      upsert: vi.fn(async (profile: ProductionProfile) => profile),
    }
  }

  function fakeSampleRequestsRepository(samples: SampleRequest[] = [testSample]) {
    return {
      list: vi.fn(async () => samples),
      upsert: vi.fn(async (sample: SampleRequest) => sample),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakeReleasesRepository(releases: FashionRelease[] = [testRelease]) {
    return {
      list: vi.fn(async () => releases),
      upsert: vi.fn(async (release: FashionRelease) => release),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakeReleaseTasksRepository(tasks: ReleaseTask[] = [testReleaseTask]) {
    return {
      list: vi.fn(async () => tasks),
      upsert: vi.fn(async (task: ReleaseTask) => task),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakeReleasePartnersRepository(links: ReleasePartnerLink[] = [testReleasePartnerLink]) {
    return {
      list: vi.fn(async () => links),
      upsert: vi.fn(async (link: ReleasePartnerLink) => link),
      delete: vi.fn(async () => undefined),
    }
  }

  function fakeWebOpsItemsRepository(items: WebOpsItem[] = [testWebOpsItem]) {
    return {
      list: vi.fn(async () => items),
      get: vi.fn(async (id: string) => items.find((item) => item.id === id) ?? null),
      upsert: vi.fn(async (item: WebOpsItem) => item),
      delete: vi.fn(async () => undefined),
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

  it('rejects unauthenticated operational task requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/tasks'), {
      env: authenticatedEnv(),
      tasksRepository: fakeTasksRepository(),
    })

    expect(response.status).toBe(401)
  })

  it('routes authenticated operational task requests', async () => {
    const env = authenticatedEnv()
    const tasksRepository = fakeTasksRepository()
    const response = await handleRequest(new Request('http://localhost/api/tasks', { headers: authenticatedHeaders(env) }), {
      env,
      tasksRepository,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ tasks: [testTask] })
    expect(tasksRepository.list).toHaveBeenCalled()
  })

  it('updates authenticated operational tasks by id', async () => {
    const env = authenticatedEnv()
    const tasksRepository = fakeTasksRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/tasks/atelier-forma-task', {
        method: 'PUT',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ status: 'done' }),
      }),
      { env, tasksRepository },
    )

    expect(response.status).toBe(200)
    expect(tasksRepository.update).toHaveBeenCalledWith('atelier-forma-task', { status: 'done' })
  })

  it('routes partner event requests with partner filters', async () => {
    const env = authenticatedEnv()
    const partnerEventsRepository = fakePartnerEventsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partner-events?partnerId=atelier-forma', { headers: authenticatedHeaders(env) }),
      { env, partnerEventsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ events: [testEvent] })
    expect(partnerEventsRepository.list).toHaveBeenCalledWith('atelier-forma')
  })

  it('routes partner evaluation requests with partner filters', async () => {
    const env = authenticatedEnv()
    const partnerEvaluationsRepository = fakePartnerEvaluationsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/partner-evaluations?partnerId=atelier-forma', { headers: authenticatedHeaders(env) }),
      { env, partnerEvaluationsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ evaluations: [testEvaluation] })
    expect(partnerEvaluationsRepository.list).toHaveBeenCalledWith('atelier-forma')
  })

  it('rejects unauthenticated production requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/production/profiles'), {
      env: authenticatedEnv(),
      productionProfilesRepository: fakeProductionProfilesRepository(),
      sampleRequestsRepository: fakeSampleRequestsRepository(),
    })

    expect(response.status).toBe(401)
  })

  it('routes authenticated production profile requests', async () => {
    const env = authenticatedEnv()
    const productionProfilesRepository = fakeProductionProfilesRepository()
    const sampleRequestsRepository = fakeSampleRequestsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/production/profiles?partnerId=atelier-forma', { headers: authenticatedHeaders(env) }),
      { env, productionProfilesRepository, sampleRequestsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ profiles: [testProductionProfile] })
    expect(productionProfilesRepository.list).toHaveBeenCalledWith('atelier-forma')
  })

  it('saves authenticated production profiles by partner id', async () => {
    const env = authenticatedEnv()
    const productionProfilesRepository = fakeProductionProfilesRepository()
    const sampleRequestsRepository = fakeSampleRequestsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/production/profiles/atelier-forma', {
        method: 'PUT',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ ...testProductionProfile, partnerId: 'ignored' }),
      }),
      { env, productionProfilesRepository, sampleRequestsRepository },
    )

    expect(response.status).toBe(200)
    expect(productionProfilesRepository.upsert).toHaveBeenCalledWith({ ...testProductionProfile, partnerId: 'atelier-forma' })
  })

  it('routes authenticated sample requests', async () => {
    const env = authenticatedEnv()
    const productionProfilesRepository = fakeProductionProfilesRepository()
    const sampleRequestsRepository = fakeSampleRequestsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/production/samples?partnerId=atelier-forma', { headers: authenticatedHeaders(env) }),
      { env, productionProfilesRepository, sampleRequestsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ samples: [testSample] })
    expect(sampleRequestsRepository.list).toHaveBeenCalledWith('atelier-forma')
  })

  it('rejects unauthenticated release requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/releases'), {
      env: authenticatedEnv(),
      releasesRepository: fakeReleasesRepository(),
      releaseTasksRepository: fakeReleaseTasksRepository(),
      releasePartnersRepository: fakeReleasePartnersRepository(),
    })

    expect(response.status).toBe(401)
  })

  it('routes authenticated release requests', async () => {
    const env = authenticatedEnv()
    const releasesRepository = fakeReleasesRepository()
    const response = await handleRequest(new Request('http://localhost/api/releases', { headers: authenticatedHeaders(env) }), {
      env,
      releasesRepository,
      releaseTasksRepository: fakeReleaseTasksRepository(),
      releasePartnersRepository: fakeReleasePartnersRepository(),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ releases: [testRelease] })
    expect(releasesRepository.list).toHaveBeenCalled()
  })

  it('saves authenticated releases by id', async () => {
    const env = authenticatedEnv()
    const releasesRepository = fakeReleasesRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/releases/drop-1', {
        method: 'PUT',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ ...testRelease, id: 'ignored' }),
      }),
      {
        env,
        releasesRepository,
        releaseTasksRepository: fakeReleaseTasksRepository(),
        releasePartnersRepository: fakeReleasePartnersRepository(),
      },
    )

    expect(response.status).toBe(200)
    expect(releasesRepository.upsert).toHaveBeenCalledWith({ ...testRelease, id: 'drop-1' })
  })

  it('routes authenticated release task requests with release filters', async () => {
    const env = authenticatedEnv()
    const releaseTasksRepository = fakeReleaseTasksRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/releases/tasks?releaseId=drop-1', { headers: authenticatedHeaders(env) }),
      {
        env,
        releasesRepository: fakeReleasesRepository(),
        releaseTasksRepository,
        releasePartnersRepository: fakeReleasePartnersRepository(),
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ tasks: [testReleaseTask] })
    expect(releaseTasksRepository.list).toHaveBeenCalledWith('drop-1')
  })

  it('routes authenticated release partner requests with release filters', async () => {
    const env = authenticatedEnv()
    const releasePartnersRepository = fakeReleasePartnersRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/releases/partners?releaseId=drop-1', { headers: authenticatedHeaders(env) }),
      {
        env,
        releasesRepository: fakeReleasesRepository(),
        releaseTasksRepository: fakeReleaseTasksRepository(),
        releasePartnersRepository,
      },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ links: [testReleasePartnerLink] })
    expect(releasePartnersRepository.list).toHaveBeenCalledWith('drop-1')
  })

  it('rejects unauthenticated web ops requests', async () => {
    const response = await handleRequest(new Request('http://localhost/api/web-ops'), {
      env: authenticatedEnv(),
      webOpsItemsRepository: fakeWebOpsItemsRepository(),
    })

    expect(response.status).toBe(401)
  })

  it('routes authenticated web ops list requests with filters', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops?release=drop-1&kind=page-brief&status=ready', {
        headers: authenticatedHeaders(env),
      }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ items: [testWebOpsItem] })
    expect(webOpsItemsRepository.list).toHaveBeenCalledWith({
      releaseId: 'drop-1',
      kind: 'page-brief',
      status: 'ready',
    })
  })

  it('creates web ops items through the repository', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository([])
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops', {
        method: 'POST',
        headers: authenticatedHeaders(env),
        body: JSON.stringify(testWebOpsItem),
      }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ item: testWebOpsItem })
    expect(webOpsItemsRepository.upsert).toHaveBeenCalledWith(testWebOpsItem)
  })

  it('returns 404 when a web ops item is not found', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository([])
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops/missing', { headers: authenticatedHeaders(env) }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(404)
  })

  it('gets a single web ops item', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops/web-ops-1', { headers: authenticatedHeaders(env) }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ item: testWebOpsItem })
  })

  it('saves web ops items by id with PUT', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops/web-ops-1', {
        method: 'PUT',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ ...testWebOpsItem, id: 'ignored' }),
      }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(200)
    expect(webOpsItemsRepository.upsert).toHaveBeenCalledWith({ ...testWebOpsItem, id: 'web-ops-1' })
  })

  it('patches web ops items by merging onto the existing record', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops/web-ops-1', {
        method: 'PATCH',
        headers: authenticatedHeaders(env),
        body: JSON.stringify({ status: 'ready' }),
      }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(200)
    expect(webOpsItemsRepository.upsert).toHaveBeenCalledWith({ ...testWebOpsItem, status: 'ready' })
  })

  it('deletes web ops items by id', async () => {
    const env = authenticatedEnv()
    const webOpsItemsRepository = fakeWebOpsItemsRepository()
    const response = await handleRequest(
      new Request('http://localhost/api/web-ops/web-ops-1', {
        method: 'DELETE',
        headers: authenticatedHeaders(env),
      }),
      { env, webOpsItemsRepository },
    )

    expect(response.status).toBe(204)
    expect(webOpsItemsRepository.delete).toHaveBeenCalledWith('web-ops-1')
  })
})
