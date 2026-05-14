import { readEnv } from './env.js'
import { errorResponse, jsonResponse, resolveOrigin } from './http.js'
import { healthRoute } from './routes/health.js'
import { mockupsRoute } from './routes/mockups.js'
import { researchRoute } from './routes/research.js'
import { visualizeRoute } from './routes/visualize.js'

export async function handleRequest(request: Request, env = readEnv()) {
  const url = new URL(request.url)
  const origin = resolveOrigin(request, env.allowedOrigins)

  if (request.method === 'OPTIONS') return jsonResponse({}, 204, origin)
  if (url.pathname === '/api/health' && request.method === 'GET') return healthRoute(request, env)
  if (url.pathname === '/api/research/partners' && request.method === 'POST') return researchRoute(request, env)
  if (url.pathname === '/api/visualize' && request.method === 'POST') return visualizeRoute(request, env)
  if (url.pathname === '/api/mockups/generate' && request.method === 'POST') return mockupsRoute(request, env)

  return errorResponse('not_found', 'Route not found', 404, origin)
}

const env = readEnv()

if (process.env.NODE_ENV !== 'test') {
  const server = await import('node:http')
  server
    .createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      incoming.on('end', async () => {
        const request = new Request(`http://localhost${incoming.url || '/'}`, {
          method: incoming.method,
          headers: incoming.headers as HeadersInit,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
          duplex: chunks.length ? 'half' : undefined,
        } as RequestInit)
        const response = await handleRequest(request, env)
        outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        outgoing.end(await response.text())
      })
    })
    .listen(env.port, () => {
      console.log(`Agorase API listening on ${env.port}`)
    })
}
