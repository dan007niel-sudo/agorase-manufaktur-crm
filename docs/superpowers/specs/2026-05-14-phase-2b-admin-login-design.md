# Phase 2B Admin Login Design

## Goal

Phase 2B protects Agorase Fashion OS with a single admin login. The app remains a one-admin product for now; team accounts, invites, roles, and workspace ownership stay out of scope.

## Current State

- Web and API are deployed on Render.
- Partner CRM data is persisted in Render Postgres.
- Browser requests call the API through `VITE_API_BASE_URL`.
- Provider secrets and database credentials are server-only.
- API routes are currently public as long as CORS origin is allowed.

## Recommended Approach

Use an API-issued `HttpOnly` session cookie.

The admin enters a password in the web app. The API compares it with the server-only `ADMIN_PASSWORD` value. On success, the API signs a short session payload with `SESSION_SECRET` and sets it as a secure cookie. The frontend never receives the password after login and never stores session tokens in `localStorage`.

This approach is intentionally small and deploys cleanly on the current Render setup.

## Environment Variables

API service required:

- `ADMIN_PASSWORD`: strong admin password set in Render.
- `SESSION_SECRET`: random secret used to sign session cookies.

Existing API env remains:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `ALLOWED_ORIGINS`

The web Static Site receives no auth secret.

## Auth API

### `POST /api/auth/login`

Request:

```json
{
  "password": "admin password"
}
```

Behavior:

- Rejects missing `ADMIN_PASSWORD` or `SESSION_SECRET` with `503`.
- Rejects missing or wrong password with `401`.
- Uses constant-time comparison for password checks.
- On success, sets a session cookie and returns:

```json
{
  "authenticated": true
}
```

Cookie attributes:

- `HttpOnly`
- `Secure` in production
- `SameSite=None` in production because web and API are on separate Render origins
- `SameSite=Lax` for localhost development
- `Path=/`
- `Max-Age=604800` for a seven-day session

### `GET /api/auth/session`

Returns:

```json
{
  "authenticated": true
}
```

or:

```json
{
  "authenticated": false
}
```

### `POST /api/auth/logout`

Clears the cookie and returns:

```json
{
  "authenticated": false
}
```

## Protected API Surface

Keep public:

- `GET /api/health`
- `OPTIONS` preflight responses

Require a valid admin session:

- `GET/POST/PUT/DELETE /api/partners`
- `POST /api/partners/import`
- `POST /api/research/partners`
- `POST /api/visualize`
- `POST /api/mockups/generate`

Unauthorized requests return:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required."
  }
}
```

with status `401`.

## Frontend Behavior

On app load:

1. Call `GET /api/auth/session` with credentials included.
2. If authenticated, show the existing Fashion OS.
3. If unauthenticated, show a focused login screen.
4. If auth check fails due to network/API error, show a retryable error.

Login form:

- one password field
- submit button
- short error state for invalid credentials
- no visible feature explanation wall

All API calls must use `credentials: 'include'` so the browser sends the session cookie to the API origin.

Logout:

- add a simple logout action in Settings.
- call `POST /api/auth/logout`.
- return to the login screen.

## CORS

Because the web and API live on separate Render origins, authenticated browser requests need:

- `Access-Control-Allow-Origin` set to the exact web origin
- `Access-Control-Allow-Credentials: true`
- request-side `credentials: 'include'`

Do not use wildcard origins.

## Security Notes

- Do not log passwords, cookie values, session payloads, or auth headers.
- Do not expose `ADMIN_PASSWORD` or `SESSION_SECRET` to the web app.
- Do not store auth tokens in `localStorage`, `sessionStorage`, or IndexedDB.
- Use `crypto.timingSafeEqual` for comparing password strings after normalizing them to buffers of equal length.
- Session payload can be minimal: admin marker plus issued-at timestamp.
- The cookie signature should use HMAC SHA-256 with `SESSION_SECRET`.
- Rotate `SESSION_SECRET` manually in Render to invalidate all active sessions.

## Testing

API tests should cover:

- missing auth config returns `503`
- wrong password returns `401`
- correct password sets cookie
- session route reads a valid cookie
- logout clears the cookie
- protected routes reject unauthenticated requests
- protected routes accept authenticated requests
- CORS responses include `Access-Control-Allow-Credentials: true`

Frontend tests should cover:

- unauthenticated session shows login
- successful login shows app shell
- invalid login shows an error
- partner API client sends credentials

Deployment checks:

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint`
- live `GET /api/health`
- live `GET /api/auth/session`
- live unauthenticated `GET /api/partners` returns `401`
- live login with the real admin password succeeds
- live authenticated `GET /api/partners` returns persisted data

## Out Of Scope

- multiple admins
- user registration
- email login
- password reset
- roles and permissions
- workspace isolation
- audit log
- rate limiting beyond basic request validation
