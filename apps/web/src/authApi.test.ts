import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSession, login, logout } from './api/authApi'

afterEach(() => vi.restoreAllMocks())

describe('authApi', () => {
  it('checks the current session with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200 }))

    await expect(getSession()).resolves.toEqual({ authenticated: false })

    expect(fetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ credentials: 'include' }))
  })

  it('logs in with credentials included', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: true }), { status: 200 }))

    await expect(login('pw')).resolves.toEqual({ authenticated: true })

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ credentials: 'include' }))
  })

  it('sends the login password as JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: true }), { status: 200 }))

    await login('pw')

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ password: 'pw' }),
      }),
    )
  })

  it('logs out with credentials included', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200 }))

    await expect(logout()).resolves.toEqual({ authenticated: false })

    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ credentials: 'include' }))
  })

  it('throws readable auth errors for failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad password', { status: 401 }))

    await expect(login('wrong')).rejects.toThrow('bad password')
  })
})
