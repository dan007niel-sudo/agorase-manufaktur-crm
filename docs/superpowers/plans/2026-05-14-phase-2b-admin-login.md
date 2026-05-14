# Phase 2B Admin Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect Agorase Fashion OS with a single admin password and API-issued `HttpOnly` session cookie.

**Architecture:** Add shared auth response contracts, server-only auth env, signed HMAC session cookies in the API, route protection for product APIs, and a small React login gate. The web app stores no auth token and sends cookies with `credentials: 'include'`.

**Tech Stack:** TypeScript, React/Vite, Node `crypto`, Fetch API, Vitest, Render env secrets.

---

## File Structure

- Modify `packages/shared/src/api.ts`: add `AuthSessionResponse`.
- Modify `.env.example`: document `ADMIN_PASSWORD` and `SESSION_SECRET`.
- Modify `render.yaml`: add `ADMIN_PASSWORD` and `SESSION_SECRET` as `sync: false` API env vars.
- Modify `apps/api/src/env.ts`: include `adminPassword`, `sessionSecret`, and `nodeEnv`.
- Modify `apps/api/src/http.ts`: add credential-aware CORS response headers and cookie helpers.
- Create `apps/api/src/auth/session.ts`: sign, verify, set, and clear session cookies.
- Create `apps/api/src/routes/auth.ts`: login/session/logout routes.
- Modify `apps/api/src/index.ts`: route `/api/auth/*` and protect product API routes.
- Modify `apps/api/src/server.test.ts`: API auth and route-protection tests.
- Create `apps/web/src/authApi.ts`: frontend auth client.
- Create `apps/web/src/authApi.test.ts`: client tests.
- Modify `apps/web/src/partnersApi.ts`: send credentials.
- Modify `apps/web/src/aiResearch.ts`: send credentials.
- Modify `apps/web/src/App.tsx`: login gate and logout action in Settings.
- Modify `apps/web/src/App.css`: login screen and auth error styles.
- Modify `README.md` and `docs/deployment/render-readiness.md`: document auth env and live checks.

## Task 1: Shared Auth Contract And Env

**Files:**
- Modify: `packages/shared/src/api.ts`
- Modify: `.env.example`
- Modify: `render.yaml`
- Modify: `apps/api/src/env.ts`
- Test: `apps/api/src/server.test.ts`

- [ ] **Step 1: Add shared auth response type**

Append to `packages/shared/src/api.ts`:

```ts
export interface AuthSessionResponse {
  authenticated: boolean
}
```

- [ ] **Step 2: Extend API env**

Modify `apps/api/src/env.ts`:

```ts
export interface ApiEnv {
  port: number
  geminiApiKey: string
  geminiTextModel: string
  geminiImageModel: string
  allowedOrigins: string[]
  databaseUrl: string
  adminPassword: string
  sessionSecret: string
  nodeEnv: string
}
```

Add to `readEnv`:

```ts
adminPassword: source.ADMIN_PASSWORD || '',
sessionSecret: source.SESSION_SECRET || '',
nodeEnv: source.NODE_ENV || 'development',
```

- [ ] **Step 3: Add env test**

Add to `apps/api/src/server.test.ts`:

```ts
it('reads admin auth secrets from server-only env', () => {
  const env = readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', NODE_ENV: 'production' })
  expect(env.adminPassword).toBe('pw')
  expect(env.sessionSecret).toBe('secret')
  expect(env.nodeEnv).toBe('production')
})
```

- [ ] **Step 4: Document local env**

Add to `.env.example` under API service values:

```bash
ADMIN_PASSWORD=
SESSION_SECRET=
```

- [ ] **Step 5: Add Render secret placeholders**

Add to the API service `envVars` in `render.yaml`:

```yaml
      - key: ADMIN_PASSWORD
        sync: false
      - key: SESSION_SECRET
        sync: false
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run build -w @agorase/shared
npx vitest run apps/api/src/server.test.ts
ruby -e 'require "yaml"; YAML.load_file("render.yaml"); puts "render.yaml parses"'
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/api.ts .env.example render.yaml apps/api/src/env.ts apps/api/src/server.test.ts
git commit -m "chore: configure admin auth env"
```

## Task 2: Session Cookie Core

**Files:**
- Create: `apps/api/src/auth/session.ts`
- Create: `apps/api/src/auth/session.test.ts`

- [ ] **Step 1: Write failing session tests**

Create `apps/api/src/auth/session.test.ts`:

```ts
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
    const cookie = buildSessionCookie(env).replace('admin', 'other')

    expect(verifySessionCookie(cookie, env)).toBe(false)
  })

  it('builds a clearing cookie', () => {
    expect(buildClearSessionCookie(readEnv({ SESSION_SECRET: 'test-secret' }))).toContain('Max-Age=0')
  })
})
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
npx vitest run apps/api/src/auth/session.test.ts
```

Expected: fail because `session.ts` does not exist.

- [ ] **Step 3: Implement session helpers**

Create `apps/api/src/auth/session.ts`:

```ts
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
```

- [ ] **Step 4: Verify session helpers**

Run:

```bash
npx vitest run apps/api/src/auth/session.test.ts
npm run typecheck -w @agorase/api
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat: add signed admin session cookies"
```

## Task 3: Auth Routes

**Files:**
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/server.test.ts`

- [ ] **Step 1: Write auth route tests**

Add tests to `apps/api/src/server.test.ts`:

```ts
it('rejects login when auth is not configured', async () => {
  const response = await handleRequest(
    new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'pw' }) }),
    readEnv({}),
  )
  expect(response.status).toBe(503)
})

it('rejects invalid admin passwords', async () => {
  const response = await handleRequest(
    new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'bad' }) }),
    readEnv({ ADMIN_PASSWORD: 'good', SESSION_SECRET: 'secret' }),
  )
  expect(response.status).toBe(401)
})

it('sets a session cookie for valid admin login', async () => {
  const response = await handleRequest(
    new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'good' }) }),
    readEnv({ ADMIN_PASSWORD: 'good', SESSION_SECRET: 'secret' }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toContain('agorase_session=')
})
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
npx vitest run apps/api/src/server.test.ts
```

Expected: auth route tests fail with 404.

- [ ] **Step 3: Implement auth route**

Create `apps/api/src/routes/auth.ts`:

```ts
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
```

- [ ] **Step 4: Wire auth route into `index.ts`**

In `apps/api/src/index.ts`, import and route before protected product routes:

```ts
import { authRoute } from './routes/auth.js'
```

```ts
if (pathname === '/api/auth/login' || pathname === '/api/auth/logout' || pathname === '/api/auth/session') {
  return authRoute(request, env)
}
```

- [ ] **Step 5: Verify auth routes**

Run:

```bash
npx vitest run apps/api/src/server.test.ts apps/api/src/auth/session.test.ts
npm run typecheck -w @agorase/api
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/index.ts apps/api/src/server.test.ts
git commit -m "feat: add admin auth routes"
```

## Task 4: Protect Product API Routes

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/server.test.ts`
- Modify: `apps/api/src/http.ts`

- [ ] **Step 1: Add route-protection tests**

Add tests to `apps/api/src/server.test.ts`:

```ts
it('rejects unauthenticated partner API requests', async () => {
  const response = await handleRequest(
    new Request('http://localhost/api/partners'),
    { env: readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }), partnersRepository: fakePartnersRepository() },
  )
  expect(response.status).toBe(401)
})

it('allows authenticated partner API requests', async () => {
  const login = await handleRequest(
    new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify({ password: 'pw' }) }),
    readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }),
  )
  const response = await handleRequest(
    new Request('http://localhost/api/partners', { headers: { cookie: login.headers.get('set-cookie') ?? '' } }),
    { env: readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret' }), partnersRepository: fakePartnersRepository() },
  )
  expect(response.status).toBe(200)
})
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
npx vitest run apps/api/src/server.test.ts
```

Expected: unauthenticated partner route still returns 200 or 503, not 401.

- [ ] **Step 3: Add auth guard**

In `apps/api/src/index.ts`, import:

```ts
import { verifySessionCookie } from './auth/session.js'
```

Add helper:

```ts
function isProtectedPath(pathname: string) {
  return (
    pathname === '/api/partners' ||
    pathname.startsWith('/api/partners/') ||
    pathname === '/api/research/partners' ||
    pathname === '/api/visualize' ||
    pathname === '/api/mockups/generate'
  )
}
```

Before product routes:

```ts
if (isProtectedPath(pathname) && !verifySessionCookie(request.headers.get('cookie'), env)) {
  return errorResponse('unauthorized', 'Authentication required.', 401, origin)
}
```

- [ ] **Step 4: Add credential-aware CORS**

Modify `apps/api/src/http.ts` so `jsonResponse` accepts optional headers:

```ts
export function jsonResponse(body: unknown, status = 200, origin = DEFAULT_ORIGIN, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
      ...headers,
    },
  })
}
```

- [ ] **Step 5: Verify route protection**

Run:

```bash
npx vitest run apps/api/src/server.test.ts apps/api/src/auth/session.test.ts
npm run typecheck -w @agorase/api
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/http.ts apps/api/src/server.test.ts
git commit -m "feat: protect product api routes"
```

## Task 5: Frontend Auth Client

**Files:**
- Create: `apps/web/src/authApi.ts`
- Create: `apps/web/src/authApi.test.ts`
- Modify: `apps/web/src/partnersApi.ts`
- Modify: `apps/web/src/partnersApi.test.ts`
- Modify: `apps/web/src/aiResearch.ts`
- Modify: `apps/web/src/aiResearch.test.ts`

- [ ] **Step 1: Write auth client tests**

Create `apps/web/src/authApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSession, login, logout } from './authApi'

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
  })

  it('logs out with credentials included', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 200 }))
    await expect(logout()).resolves.toEqual({ authenticated: false })
  })
})
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
npx vitest run apps/web/src/authApi.test.ts
```

Expected: fail because `authApi.ts` does not exist.

- [ ] **Step 3: Implement auth client**

Create `apps/web/src/authApi.ts`:

```ts
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
```

- [ ] **Step 4: Send credentials from existing clients**

In `apps/web/src/partnersApi.ts`, add:

```ts
credentials: 'include',
```

to the `fetch` options.

In `apps/web/src/aiResearch.ts`, add:

```ts
credentials: 'include',
```

to the research `fetch` options.

- [ ] **Step 5: Update client tests**

In `apps/web/src/partnersApi.test.ts`, assert calls include `credentials: 'include'`.

In `apps/web/src/aiResearch.test.ts`, assert `requestAiManufactories` uses `credentials: 'include'`.

- [ ] **Step 6: Verify clients**

Run:

```bash
npx vitest run apps/web/src/authApi.test.ts apps/web/src/partnersApi.test.ts apps/web/src/aiResearch.test.ts
npm run typecheck -w @agorase/web
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/authApi.ts apps/web/src/authApi.test.ts apps/web/src/partnersApi.ts apps/web/src/partnersApi.test.ts apps/web/src/aiResearch.ts apps/web/src/aiResearch.test.ts
git commit -m "feat: add admin auth client"
```

## Task 6: Frontend Login Gate

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`

- [ ] **Step 1: Import auth client**

In `apps/web/src/App.tsx`, import:

```ts
import { getSession, login, logout } from './authApi'
```

- [ ] **Step 2: Add auth state**

Inside `App`, add:

```ts
const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'error'>('checking')
const [authError, setAuthError] = useState('')
```

- [ ] **Step 3: Check session before loading records**

Add a `useEffect` that calls `getSession()`. Only call `listPartners()` after `authStatus === 'authenticated'`.

Update the existing records-loading effect dependency to:

```ts
}, [authStatus])
```

and start it with:

```ts
if (authStatus !== 'authenticated') return
```

- [ ] **Step 4: Add login handlers**

Inside `App`, add:

```ts
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
```

- [ ] **Step 5: Add login view component**

Add to `App.tsx`:

```tsx
function LoginView({
  status,
  error,
  onLogin,
}: {
  status: 'checking' | 'unauthenticated' | 'error'
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
```

- [ ] **Step 6: Gate the app shell**

Before returning the existing app shell:

```tsx
if (authStatus !== 'authenticated') {
  return <LoginView status={authStatus === 'authenticated' ? 'checking' : authStatus} error={authError} onLogin={handleLogin} />
}
```

- [ ] **Step 7: Add logout to Settings**

Pass `onLogout={handleLogout}` into `SettingsView` and add a secondary logout button:

```tsx
<button type="button" onClick={onLogout}>
  Logout
</button>
```

- [ ] **Step 8: Add login CSS**

Add to `apps/web/src/App.css`:

```css
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--paper);
}

.login-panel {
  width: min(360px, 100%);
  display: grid;
  gap: 16px;
  border: 1px solid var(--line);
  background: #fffdf8;
  border-radius: 8px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.login-panel img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
```

- [ ] **Step 9: Verify frontend**

Run:

```bash
npm run typecheck -w @agorase/web
npm run build -w @agorase/web
```

Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.css
git commit -m "feat: gate web app behind admin login"
```

## Task 7: Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment/render-readiness.md`

- [ ] **Step 1: Document auth env**

Add to README Render Deployment:

```md
Phase 2B protects the app with an API-issued admin session cookie. Set `ADMIN_PASSWORD` and `SESSION_SECRET` only on the API service.
```

- [ ] **Step 2: Update readiness checklist**

Add to `docs/deployment/render-readiness.md`:

```md
- Confirm API env has `ADMIN_PASSWORD` and `SESSION_SECRET`.
- Confirm web env does not contain auth secrets.
- Confirm unauthenticated `GET /api/partners` returns `401`.
- Confirm authenticated `GET /api/partners` returns persisted partner data.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Expected: tests, typecheck, build, and lint pass. Web bundle secret scan has no output.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/deployment/render-readiness.md
git commit -m "docs: document admin login deployment"
```

## Task 8: Deploy And Live Smoke Test

**Files:**
- No code files.

- [ ] **Step 1: Push main**

Run:

```bash
git push
```

- [ ] **Step 2: Add Render API secrets**

In Render API service, set:

```txt
ADMIN_PASSWORD=<strong password>
SESSION_SECRET=<random long secret>
```

Use a generated secret for `SESSION_SECRET`, for example:

```bash
openssl rand -base64 48
```

- [ ] **Step 3: Wait for deploy and verify public health**

Run:

```bash
curl -sS https://agorase-fashion-os-api.onrender.com/api/health
```

Expected: `ok: true`.

- [ ] **Step 4: Verify unauthenticated protection**

Run:

```bash
curl -sS -i https://agorase-fashion-os-api.onrender.com/api/partners
```

Expected: `401` with `unauthorized`.

- [ ] **Step 5: Verify live login with cookie jar**

Run:

```bash
curl -sS -i -c /tmp/agorase-cookies.txt \
  -H 'Origin: https://agorase-fashion-os-web.onrender.com' \
  -H 'Content-Type: application/json' \
  -X POST https://agorase-fashion-os-api.onrender.com/api/auth/login \
  --data '{"password":"<ADMIN_PASSWORD>"}'

curl -sS -b /tmp/agorase-cookies.txt \
  -H 'Origin: https://agorase-fashion-os-web.onrender.com' \
  https://agorase-fashion-os-api.onrender.com/api/partners
```

Expected: login returns `authenticated: true`; partners returns the six persisted seed records.

- [ ] **Step 6: Verify web app**

Open:

```txt
https://agorase-fashion-os-web.onrender.com
```

Expected: login screen before password, Fashion OS after password.

- [ ] **Step 7: Report**

Summarize:

- commits pushed
- Render env values that must remain API-only
- live auth status
- live partner data access after login
