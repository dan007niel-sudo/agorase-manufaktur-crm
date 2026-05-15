import { useEffect, useState } from 'react'
import { getSession, login, logout } from '../api/authApi'

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error'
export type RecordsStatus = 'loading' | 'ready' | 'error'

export const storageKeys = {
  records: 'agorase.records',
  templates: 'agorase.templates',
  completedTasks: 'agorase.completedTasks',
}

export function resetStoredStateFromQuery() {
  if (!window.location.search.includes('reset=1')) return

  Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key))
  window.history.replaceState({}, '', window.location.pathname)
}

export function useAdminAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const session = await getSession()
        if (!active) return
        setAuthStatus(session.authenticated ? 'authenticated' : 'unauthenticated')
        setAuthError('')
      } catch {
        if (!active) return
        setAuthStatus('error')
        setAuthError('Session konnte nicht geprüft werden.')
      }
    }

    void checkSession()
    return () => {
      active = false
    }
  }, [])

  async function handleLogin(password: string) {
    try {
      const session = await login(password)
      setAuthStatus(session.authenticated ? 'authenticated' : 'unauthenticated')
      setAuthError('')
    } catch {
      setAuthStatus('unauthenticated')
      setAuthError('Login fehlgeschlagen.')
    }
  }

  async function handleLogout() {
    await logout()
    setAuthStatus('unauthenticated')
  }

  return { authStatus, authError, handleLogin, handleLogout }
}

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  })

  function updateValue(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      return resolved
    })
  }

  return [value, updateValue] as const
}
