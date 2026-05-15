import { useState, type ReactNode } from 'react'
import logo from '../assets/agorase-logo.jpeg'
import type { AuthStatus } from './authState'

export function AuthGate({
  status,
  error,
  onLogin,
  children,
}: {
  status: AuthStatus
  error: string
  onLogin: (password: string) => void | Promise<void>
  children: ReactNode
}) {
  if (status === 'authenticated') return <>{children}</>

  return <LoginView status={status} error={error} onLogin={onLogin} />
}

function LoginView({
  status,
  error,
  onLogin,
}: {
  status: Exclude<AuthStatus, 'authenticated'>
  error: string
  onLogin: (password: string) => void | Promise<void>
}) {
  const [password, setPassword] = useState('')
  const loading = status === 'checking'

  return (
    <main className="login-shell">
      <form
        className="login-panel"
        onSubmit={(event) => {
          event.preventDefault()
          void onLogin(password)
        }}
      >
        <img src={logo} alt="Agorase Logo" />
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button type="submit" className="primary-button" disabled={loading || !password}>
          {loading ? 'Prüfe...' : 'Einloggen'}
        </button>
      </form>
    </main>
  )
}
