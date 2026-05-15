import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ApiEnv } from '../env.js'

const SESSION_COOKIE = 'agorase_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function buildSessionCookie(env: ApiEnv) {
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', iat: Date.now() })).toString('base64url')
  const signature = sign(payload, env.sessionSecret)
  return serializeCookie(`${payload}.${signature}`, env, SESSION_MAX_AGE_SECONDS)
}

export function buildClearSessionCookie(env: ApiEnv) {
  return serializeCookie('', env, 0)
}

export function verifySessionCookie(cookieHeader: string | null, env: ApiEnv) {
  if (!env.sessionSecret || !cookieHeader) return false
  const value = parseCookie(cookieHeader, SESSION_COOKIE)
  if (!value) return false
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return false
  const expected = sign(payload, env.sessionSecret)
  if (!safeEqual(signature, expected)) return false

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string }
    return decoded.sub === 'admin'
  } catch {
    return false
  }
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function parseCookie(cookieHeader: string, name: string) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

function serializeCookie(value: string, env: ApiEnv, maxAge: number) {
  const production = env.nodeEnv === 'production'
  const sameSite = production ? 'SameSite=None' : 'SameSite=Lax'
  const secure = production ? '; Secure' : ''
  return `${SESSION_COOKIE}=${value}; HttpOnly${secure}; ${sameSite}; Path=/; Max-Age=${maxAge}`
}
