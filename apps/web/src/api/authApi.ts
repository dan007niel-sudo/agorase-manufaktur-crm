import type { AuthSessionResponse } from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

async function requestAuth(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Auth request failed with status ${response.status}`)
  }

  return (await response.json()) as AuthSessionResponse
}

export function getSession() {
  return requestAuth('/api/auth/session', { method: 'GET' })
}

export function login(password: string) {
  return requestAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return requestAuth('/api/auth/logout', { method: 'POST' })
}
