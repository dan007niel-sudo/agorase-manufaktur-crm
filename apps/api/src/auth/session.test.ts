import { describe, expect, it } from 'vitest'
import { buildClearSessionCookie, buildSessionCookie, verifySessionCookie } from './session.js'
import { readEnv } from '../env.js'

describe('session cookies', () => {
  it('signs and verifies a session cookie', () => {
    const env = readEnv({ SESSION_SECRET: 'test-secret', NODE_ENV: 'production' })
    const cookie = buildSessionCookie(env)

    expect(cookie).toContain('agorase_session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=None')
    expect(verifySessionCookie(cookie, env)).toBe(true)
  })

  it('rejects tampered cookies', () => {
    const env = readEnv({ SESSION_SECRET: 'test-secret' })
    const cookie = buildSessionCookie(env)
    const tamperedCookie = cookie.replace('agorase_session=', 'agorase_session=x')

    expect(verifySessionCookie(tamperedCookie, env)).toBe(false)
  })

  it('builds a clearing cookie', () => {
    expect(buildClearSessionCookie(readEnv({ SESSION_SECRET: 'test-secret' }))).toContain('Max-Age=0')
  })
})
