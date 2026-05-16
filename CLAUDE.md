# Agorase Fashion OS — Project Instructions

## What is this project

Private, admin-only Operating System für Sourcing, Bewertung, Production, Creative Lab, Mockups, Legal Orientation, Releases, Web Ops und Settings einer kuratierten Fashion-Brand. Kein Public-Storefront, kein Multi-Tenancy, kein Billing.

## Stack

- **Web:** TypeScript, React 19, Vite, Render Static Site
- **API:** Node HTTP server (no Express), `pg` for Postgres, Render Web Service
- **DB:** Render Postgres, schema-driven migrations at API startup (`apps/api/src/db/migrate.ts`)
- **AI:** Server-side Gemini proxy (text + image). API key never leaves `apps/api/`.
- **Tests:** Vitest + Testing Library (jsdom for web)
- **Monorepo:** npm workspaces

## Architecture

```
packages/shared/    → shared contracts (types, request/response shapes, runtime constants)
apps/api/           → auth-protected routes, repositories, migrations, provider adapters
apps/web/           → React/Vite UI, API clients, section components
```

Data flow per domain:
1. `packages/shared/src/<domain>.ts` defines `<Domain>`, `<Domain>Input`, union types, and runtime const arrays.
2. `apps/api/src/db/schema.sql` declares the table (idempotent CREATE).
3. `apps/api/src/db/<domain>Repository.ts` maps rows ↔ shared types, with `.test.ts` covering mapping/validation/CRUD.
4. `apps/api/src/routes/<domain>.ts` exports an HTTP handler registered in `apps/api/src/index.ts` (route dispatch + `isProtectedPath` list).
5. `apps/web/src/api/<domain>Api.ts` calls the server with `credentials: 'include'`, with `.test.ts` covering request shape.
6. `apps/web/src/sections/<domain>/<Domain>View.tsx` renders the section using shared `components/Panel.tsx` + `components/FormControls.tsx`.
7. If the domain produces operator-actionable items, `<domain>Tasks.ts` derives `CrmTask`/`OperationalTask` entries for the Command Center.

## Key Files

- `apps/api/src/index.ts` — single dispatcher; trailing-slash normalization (`pathname.replace(/\/$/, '')`); `isProtectedPath` array; `ApiContext` (repo bag)
- `apps/api/src/auth/session.ts` — session-cookie guard
- `apps/api/src/http.ts` — response helpers (`json`, `error`)
- `apps/api/src/env.ts` — env-var loader (`GEMINI_API_KEY`, `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `ALLOWED_ORIGINS`)
- `apps/api/src/db/client.ts` — `pg.Pool`
- `apps/api/src/db/migrate.ts` — startup migration; loads `schema.sql` from `dist` then falls back to `src` (Lesson: `1598023`)
- `apps/api/src/db/schema.sql` — single source of truth for tables
- `apps/web/src/App.tsx` — composition root; loads all section data after auth; section router
- `apps/web/src/fashionOs.ts` — sidebar module registry (every section listed here)
- `apps/web/src/app/AppShell.tsx`, `apps/web/src/app/AuthGate.tsx`, `apps/web/src/app/authState.ts` — shell + auth
- `apps/web/src/aiResearch.ts` — existing AI-research web client (template for AI features)
- `packages/shared/src/index.ts` — barrel re-exports every shared module
- `render.yaml` — service definitions + env names

## Conventions

### Language
- **UI strings: German.** Buttons, labels, headings, aria-labels, helper text. Match the tone of `ReleasesView.tsx` / `WebOpsView.tsx` / `PartnersView.tsx`.
- **Code, identifiers, comments, commit messages: English.**

### Schema
- Every table uses `id text primary key` (caller-provided slug/uuid).
- Foreign-key relationships are by `<other>_id text` columns **without** a `references` clause. This is intentional — keeps schema changes loose.
- Dates and timestamps inside domain rows use `text` columns (the shared interface uses `string`). Only `created_at` / `updated_at` use `timestamptz default now()`.
- JSON fields use `jsonb not null default '[]'::jsonb` (or `'{}'::jsonb`).

### API routes
- All product routes behind session-cookie guard. Exception list is fixed: `GET /api/health`, `GET /api/auth/session`, `POST /api/auth/login`, `POST /api/auth/logout`, `OPTIONS` preflight.
- Add `'/api/<domain>'` AND `'/api/<domain>/'` to `isProtectedPath` in `apps/api/src/index.ts`.
- Routes that hit Gemini: read `GEMINI_API_KEY` from server env, never echo it back, sanitize upstream errors to `502 <something>_failed` without leaking URLs/headers.
- Validation in the repository's `normalize…Input` (throws `ApiInputError` for 400).

### Web clients
- Every fetch uses `credentials: 'include'`.
- Mirror the `requestJson` helper pattern from `releasesApi.ts` / `webOpsApi.ts` / `partnersApi.ts`.
- Errors propagate as thrown `Error` with a sanitized message.

### UI
- Replace `WorkspaceFoundation` placeholders in `App.tsx`, don't add alongside.
- Section components live in `apps/web/src/sections/<domain>/<Domain>View.tsx`.
- Reuse `components/Panel.tsx` (layout) and `components/FormControls.tsx` (inputs).
- Hex colors `#fffdf8` / `#f4efe4` are the project's de-facto tokens (not yet abstracted).

### Tests
- TDD: write a failing test for the smallest unit, then implement, then move on.
- Repository test bar: list, get, insert, update, delete, validation errors, JSON-column parsing.
- Server test bar: 401 unauthenticated, validation 400, persistence happy path, every CRUD verb.
- Web client test bar: request shape, `credentials: 'include'`, error path.
- AI route extra: provider 500 sanitization, malformed-output fallback, no-secret-leak grep on response JSON.

## Deploy Workflow

Per phase (`3H`, `3D`, `3E`, `3F`, `3I`, `3J`):

1. `git worktree add .worktrees/phase-<N>-<slug> -b codex/phase-<N>-<slug>`
2. `npm install`, then baseline `npm test && npm run typecheck && npm run build && npm run lint`
3. Write `docs/superpowers/specs/2026-05-15-phase-<N>-<slug>-design.md`
4. Write `docs/superpowers/plans/2026-05-15-phase-<N>-<slug>.md`
5. TDD implement following the data-flow order above
6. Run gates + `rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist`
7. Commit on phase branch with `feat: <imperative phase summary>` (no Co-Authored-By unless project changes); fast-forward merge to `main`; push `origin main`
8. Render auto-deploys API + Web. Poll: `until [ "$(curl -sS -o /dev/null -w '%{http_code}' https://agorase-fashion-os-api.onrender.com/api/<new-route>)" = "401" ]; do sleep 10; done`
9. Smoke: `/api/health` returns providers ready, new route returns 401 unauthenticated, web root returns 200, existing routes still 401
10. Remove worktree + branch, update `SESSION_HANDOFF.md`

### Three-Agent Flow

1. `code-writer` implements + verifies locally. Does not commit, does not deploy.
2. `code-reviewer` audits the diff. Reports findings. Does not modify files.
3. If blocking findings → back to `code-writer`.
4. `deployer` commits, merges to `main`, pushes, smoke-tests live deploy.

## Secrets / Env Vars (names only)

**API service (Render):**
- `GEMINI_API_KEY` — required for AI routes (research, brainstorm, mockups)
- `GOOGLE_API_KEY` — secondary, currently same usage
- `DATABASE_URL` — Render Postgres connection
- `ADMIN_PASSWORD` — single admin login secret
- `SESSION_SECRET` — HMAC for session cookie
- `ALLOWED_ORIGINS` — exact origins, no wildcard; must include the web service URL

**Web service (Render Static):**
- `VITE_API_BASE_URL` — points at API service

**Never put any API-service secret into Vite/web env.** The web bundle scan is part of the deploy gate.

## Cookie / CORS Rules

- Session cookie: `HttpOnly`, `Secure` in production, `SameSite=None` (cross-origin web ↔ api on Render).
- All web fetches: `credentials: 'include'`.
- API responds with `Access-Control-Allow-Credentials: true` and the exact origin from `ALLOWED_ORIGINS`.
- Trailing-slash routes must work (`/api/foo` AND `/api/foo/`) — Render once 404'd preflight on the un-normalized variant. The dispatcher already normalizes; keep it that way.

## Lessons Learned

- **`schema.sql` not copied by tsc.** Migration runner reads from `dist/db/schema.sql` and falls back to `src/db/schema.sql`. Don't try to copy it during build; the fallback handles both dev and production. (Fix: `1598023`)
- **Render serves the old API briefly after push.** Don't trust `404` on a newly added route during a 1–3 minute window after push. Poll until the new route returns `401` (auth-protected) — that confirms the new version is live.
- **Set new Render env vars BEFORE pushing code that needs them.** A push that depends on `<NEW_KEY>` will hit `503 <something>_not_configured` until the env var is set and the service restarts.
- **CORS preflight 404 on trailing slash.** Cause: route registered without trailing-slash normalization. Fix: API normalizes all `pathname` via `replace(/\/$/, '')` before matching. New routes inherit this for free if registered correctly.
- **Top-level await fails with `npx tsx -e`.** For one-off seed/import scripts, wrap in an async function instead of relying on top-level await.
- **Old worktrees can pile up.** `.worktrees/fashion-os-{api,deploy,monorepo,ui}` are pre-Phase-3 leftovers. Don't accidentally edit them; always work in the explicitly-created `phase-<N>-<slug>` worktree.
- **Node HTTP adapter must use `arrayBuffer`, not `text`, for response bodies.** `apps/api/src/index.ts` round-trips every `Response` back through `outgoing.end(...)`. Using `await response.text()` UTF-8-decodes the body and silently corrupts binary payloads (e.g. mockup image downloads). Use `Buffer.from(await response.arrayBuffer())` — works identically for JSON, but preserves bytes for images. Vitest tests bypass the adapter (they call `handleRequest` directly), so this kind of corruption only surfaces in production. (Fix: Phase 4A.)
- **Adding new shared types: check for naming collisions.** `packages/shared/src/index.ts` re-exports every module via `export * from`. Two modules exporting the same name (e.g. `LegalNote` once in `fashion.ts` and once in `legal.ts`) produces a hard TS error. Before adding a type, grep the existing shared modules. Remove dead placeholder types when adding the real version.
- **Web-bundle secret-scan regex matches env-var NAMES.** The deploy-gate `rg 'GEMINI_API_KEY|...' apps/web/dist` matches the literal strings, not just values. When the UI documents required secrets (e.g. Settings/Diagnostics), use German labels (`Gemini-API-Schlüssel`) — not literal env-var names. (Lesson from Phase 3I.)
- **Persistence-before-call for AI provider routes.** Write the `pending` job row to the DB before calling the provider; update to `completed`/`failed` after. A crash or timeout mid-call still leaves an audit row. Pattern established in Phase 3E Mockups and 3D Creative Lab.

## Out of Scope

Until explicitly added:
- Multi-user tenancy, public accounts, billing, payments, customer-facing storefront
- Destructive restore on Settings import (read-only export only)
- Schema migrations beyond idempotent `CREATE TABLE IF NOT EXISTS`
- Full digital asset manager (Mockups stores metadata + small inline payloads only)
- Internationalization framework (German strings inline)
