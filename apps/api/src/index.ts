import { readEnv, type ApiEnv } from './env.js'
import { createDbPool } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import { createPostgresPartnersRepository } from './db/partnersRepository.js'
import { errorResponse, jsonResponse, resolveOrigin } from './http.js'
import { healthRoute } from './routes/health.js'
import { mockupsRoute } from './routes/mockups.js'
import { partnersRoute, type PartnersRepository } from './routes/partners.js'
import { researchRoute } from './routes/research.js'
import { visualizeRoute } from './routes/visualize.js'

export interface ApiContext {
  env: ApiEnv
  partnersRepository?: PartnersRepository
}

export async function handleRequest(request: Request, contextOrEnv: ApiEnv | ApiContext = readEnv()) {
  const context = toContext(contextOrEnv)
  const env = context.env
  const url = new URL(request.url)
  const origin = resolveOrigin(request, env.allowedOrigins)
  const pathname = url.pathname.replace(/\/$/, '')

  if (request.method === 'OPTIONS') return jsonResponse({}, 204, origin)
  if (pathname === '/api/health' && request.method === 'GET') return healthRoute(request, env)
  if (pathname === '/api/research/partners' && request.method === 'POST') return researchRoute(request, env)
  if (pathname === '/api/visualize' && request.method === 'POST') return visualizeRoute(request, env)
  if (pathname === '/api/mockups/generate' && request.method === 'POST') return mockupsRoute(request, env)
  if (pathname === '/api/partners' || pathname.startsWith('/api/partners/')) {
    if (!context.partnersRepository) {
      return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    }
    return partnersRoute(request, env, context.partnersRepository)
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

function toContext(contextOrEnv: ApiEnv | ApiContext): ApiContext {
  return 'env' in contextOrEnv ? contextOrEnv : { env: contextOrEnv }
}

const env = readEnv()

if (process.env.NODE_ENV !== 'test') {
  const pool = createDbPool(env)
  await runMigrations(pool)
  const context: ApiContext = {
    env,
    partnersRepository: pool ? createPostgresPartnersRepository(pool) : undefined,
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
