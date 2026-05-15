import { readEnv, type ApiEnv } from './env.js'
import { verifySessionCookie } from './auth/session.js'
import { createDbPool } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import { createPostgresPartnerEvaluationsRepository } from './db/partnerEvaluationsRepository.js'
import { createPostgresPartnerEventsRepository } from './db/partnerEventsRepository.js'
import { createPostgresPartnersRepository } from './db/partnersRepository.js'
import { createPostgresProductionProfilesRepository } from './db/productionProfilesRepository.js'
import { createPostgresSampleRequestsRepository } from './db/sampleRequestsRepository.js'
import { createPostgresTasksRepository } from './db/tasksRepository.js'
import { errorResponse, jsonResponse, resolveOrigin } from './http.js'
import { healthRoute } from './routes/health.js'
import { authRoute } from './routes/auth.js'
import { mockupsRoute } from './routes/mockups.js'
import { partnerEvaluationsRoute, type PartnerEvaluationsRepository } from './routes/partnerEvaluations.js'
import { partnerEventsRoute, type PartnerEventsRepository } from './routes/partnerEvents.js'
import { partnersRoute, type PartnersRepository } from './routes/partners.js'
import { productionRoute, type ProductionProfilesRepository, type SampleRequestsRepository } from './routes/production.js'
import { researchRoute } from './routes/research.js'
import { tasksRoute, type TasksRepository } from './routes/tasks.js'
import { visualizeRoute } from './routes/visualize.js'

export interface ApiContext {
  env: ApiEnv
  partnersRepository?: PartnersRepository
  tasksRepository?: TasksRepository
  partnerEventsRepository?: PartnerEventsRepository
  partnerEvaluationsRepository?: PartnerEvaluationsRepository
  productionProfilesRepository?: ProductionProfilesRepository
  sampleRequestsRepository?: SampleRequestsRepository
}

export async function handleRequest(request: Request, contextOrEnv: ApiEnv | ApiContext = readEnv()) {
  const context = toContext(contextOrEnv)
  const env = context.env
  const url = new URL(request.url)
  const origin = resolveOrigin(request, env.allowedOrigins)
  const pathname = url.pathname.replace(/\/$/, '')

  if (request.method === 'OPTIONS') return jsonResponse({}, 204, origin)
  if (pathname === '/api/health' && request.method === 'GET') return healthRoute(request, env)
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout' || pathname === '/api/auth/session') {
    return authRoute(request, env)
  }
  if (isProtectedPath(pathname) && !verifySessionCookie(request.headers.get('cookie'), env)) {
    return errorResponse('unauthorized', 'Authentication required.', 401, origin)
  }
  if (pathname === '/api/research/partners' && request.method === 'POST') return researchRoute(request, env)
  if (pathname === '/api/visualize' && request.method === 'POST') return visualizeRoute(request, env)
  if (pathname === '/api/mockups/generate' && request.method === 'POST') return mockupsRoute(request, env)
  if (pathname === '/api/partners' || pathname.startsWith('/api/partners/')) {
    if (!context.partnersRepository) {
      return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    }
    return partnersRoute(request, env, context.partnersRepository)
  }
  if (pathname === '/api/tasks' || pathname.startsWith('/api/tasks/')) {
    if (!context.tasksRepository) return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    return tasksRoute(request, env, context.tasksRepository)
  }
  if (pathname === '/api/partner-events' || pathname.startsWith('/api/partner-events/')) {
    if (!context.partnerEventsRepository) return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    return partnerEventsRoute(request, env, context.partnerEventsRepository)
  }
  if (pathname === '/api/partner-evaluations' || pathname.startsWith('/api/partner-evaluations/')) {
    if (!context.partnerEvaluationsRepository) return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    return partnerEvaluationsRoute(request, env, context.partnerEvaluationsRepository)
  }
  if (pathname === '/api/production/profiles' || pathname.startsWith('/api/production/profiles/') || pathname === '/api/production/samples' || pathname.startsWith('/api/production/samples/')) {
    if (!context.productionProfilesRepository || !context.sampleRequestsRepository) {
      return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    }
    return productionRoute(request, env, {
      productionProfilesRepository: context.productionProfilesRepository,
      sampleRequestsRepository: context.sampleRequestsRepository,
    })
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

function toContext(contextOrEnv: ApiEnv | ApiContext): ApiContext {
  return 'env' in contextOrEnv ? contextOrEnv : { env: contextOrEnv }
}

function isProtectedPath(pathname: string) {
  return (
    pathname === '/api/partners' ||
    pathname.startsWith('/api/partners/') ||
    pathname === '/api/tasks' ||
    pathname.startsWith('/api/tasks/') ||
    pathname === '/api/partner-events' ||
    pathname.startsWith('/api/partner-events/') ||
    pathname === '/api/partner-evaluations' ||
    pathname.startsWith('/api/partner-evaluations/') ||
    pathname === '/api/production/profiles' ||
    pathname.startsWith('/api/production/profiles/') ||
    pathname === '/api/production/samples' ||
    pathname.startsWith('/api/production/samples/') ||
    pathname === '/api/research/partners' ||
    pathname === '/api/visualize' ||
    pathname === '/api/mockups/generate'
  )
}

const env = readEnv()

if (process.env.NODE_ENV !== 'test') {
  const pool = createDbPool(env)
  await runMigrations(pool)
  const context: ApiContext = {
    env,
    partnersRepository: pool ? createPostgresPartnersRepository(pool) : undefined,
    tasksRepository: pool ? createPostgresTasksRepository(pool) : undefined,
    partnerEventsRepository: pool ? createPostgresPartnerEventsRepository(pool) : undefined,
    partnerEvaluationsRepository: pool ? createPostgresPartnerEvaluationsRepository(pool) : undefined,
    productionProfilesRepository: pool ? createPostgresProductionProfilesRepository(pool) : undefined,
    sampleRequestsRepository: pool ? createPostgresSampleRequestsRepository(pool) : undefined,
  }
  const server = await import('node:http')
  server
    .createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      incoming.on('end', async () => {
        const host = incoming.headers.host || `localhost:${env.port}`
        const request = new Request(`http://${host}${incoming.url || '/'}`, {
          method: incoming.method,
          headers: incoming.headers as HeadersInit,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
          duplex: chunks.length ? 'half' : undefined,
        } as RequestInit)
        const response = await handleRequest(request, context)
        outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        outgoing.end(await response.text())
      })
    })
    .listen(env.port, () => {
      console.log(`Agorase API listening on ${env.port}`)
    })

  process.on('SIGTERM', async () => {
    await pool?.end()
    process.exit(0)
  })
}
