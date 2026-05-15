import { timingSafeEqual } from 'node:crypto'
import type { AuthSessionResponse } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin } from '../http.js'
import { buildClearSessionCookie, buildSessionCookie, verifySessionCookie } from '../auth/session.js'

export async function authRoute(request: Request, env: ApiEnv) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const pathname = new URL(request.url).pathname.replace(/\/$/, '')

  if (pathname === '/api/auth/session' && request.method === 'GET') {
    return jsonResponse<AuthSessionResponse>(
      { authenticated: verifySessionCookie(request.headers.get('cookie'), env) },
      200,
      origin,
    )
  }

  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    return jsonResponse<AuthSessionResponse>(
      { authenticated: false },
      200,
      origin,
      { 'set-cookie': buildClearSessionCookie(env) },
    )
  }

  if (pathname === '/api/auth/login' && request.method === 'POST') {
    if (!env.adminPassword || !env.sessionSecret) {
      return errorResponse('auth_not_configured', 'Authentication is not configured.', 503, origin)
    }
    const body = await readJson<{ password?: string }>(request)
    if (!matchesPassword(body.password ?? '', env.adminPassword)) {
      return errorResponse('unauthorized', 'Authentication failed.', 401, origin)
    }
    return jsonResponse<AuthSessionResponse>(
      { authenticated: true },
      200,
      origin,
      { 'set-cookie': buildSessionCookie(env) },
    )
  }

  return errorResponse('not_found', 'Route not found', 404, origin)
}

function matchesPassword(input: string, expected: string) {
  const left = Buffer.from(input)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
