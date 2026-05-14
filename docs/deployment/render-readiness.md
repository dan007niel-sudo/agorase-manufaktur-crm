# Render Deployment Readiness

Status: ready for Render Blueprint setup after local verification.

This note captures the Render settings for the current Phase 2A monorepo:

- `apps/web` for the React/Vite frontend
- `apps/api` for the secure Node API service
- `packages/shared` for shared TypeScript contracts
- root npm workspace scripts such as `build:web`, `build:api`, `typecheck`, and `test`
- root `render.yaml` with one API Web Service, one Static Site, and one Render Postgres database

## Web: Render Static Site

Recommended service:

- Type: Static Site
- Name: `agorase-fashion-os-web`
- Root directory: repository root
- Build command: `npm install && npm run build:web`
- Publish directory: `apps/web/dist`
- Node version: `24`
- Pull request previews: optional

The production web service should only receive non-secret client configuration:

- `VITE_API_BASE_URL`: deployed API service origin, for example `https://agorase-fashion-os-api.onrender.com`

Do not configure provider keys, Gemini keys, Google keys, or other secrets on the Static Site. `VITE_API_PROXY_TARGET` is dev-only Vite proxy configuration and must not be treated as production routing.

Render Static Sites do not securely proxy `/api` to a backend by default. Use the `VITE_API_BASE_URL` approach unless the team intentionally configures and verifies an external rewrite/proxy rule for API traffic.

## API: Render Web Service

Recommended service:

- Type: Web Service
- Runtime: Node
- Name: `agorase-fashion-os-api`
- Root directory: repository root
- Build command: `npm install && npm run build:api`
- Start command: `npm run start -w @agorase/api`
- Node version: `24`
- Region: `frankfurt`
- Health check path: `/api/health`, if implemented by the API branch
- Plan: choose the smallest plan that supports expected API latency and traffic; `starter` is the planned default

The API service owns all provider calls that require secrets. Browser code should call product-level internal API routes, for example:

- `/api/health`
- `/api/research/partners`
- `/api/brainstorm`
- `/api/visualize`
- `/api/mockups/generate`

## Database: Render Postgres

Recommended database:

- Type: PostgreSQL
- Name: `agorase-fashion-os-db`
- Region: `frankfurt`
- Database name: `agorase_fashion_os`
- Connection: API service env `DATABASE_URL` through `fromDatabase` with `property: connectionString`

The Static Site must not receive `DATABASE_URL` or any other database credential.

## Environment Variables

### API Service

Required:

- `GEMINI_API_KEY`: Google Gemini API key. Set as a secret in Render.
- `ALLOWED_ORIGINS`: deployed Static Site origin, for example `https://agorase-fashion-os-web.onrender.com`. Use a comma-separated list only when more than one trusted origin is required. Do not use `*` in production.
- `DATABASE_URL`: Render Postgres connection string from `agorase-fashion-os-db`.

Supported fallback/optional variables:

- `GOOGLE_API_KEY`: optional fallback if the API env loader supports it.
- `GEMINI_TEXT_MODEL`: server-side text model ID, for example `gemini-2.5-pro`.
- `GEMINI_IMAGE_MODEL`: server-side image model ID for the future image adapter.
- `PORT`: Render provides this automatically; local default can remain `8787`.
- `NODE_VERSION`: `24`.

### Web Static Site

Required after frontend integration:

- `VITE_API_BASE_URL`: deployed API service URL, if used by the merged web code.

Optional/local-only:

- `VITE_API_PROXY_TARGET`: local Vite proxy target such as `http://localhost:8787`.

Forbidden on the web service:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`
- `DATABASE_URL`
- Any other provider secret or credential

## SPA Rewrite

The Static Site must rewrite all application routes to the Vite entry point:

- Source: `/*`
- Destination: `/index.html`
- Type: rewrite

Without this, direct visits to client routes such as `/partners`, `/creative-lab`, or `/web-ops` can return 404s.

## Security Notes

- Gemini and Google API keys belong only to `apps/api` runtime configuration.
- No Gemini credentials should appear in Vite env vars because `VITE_*` variables are exposed to client bundles.
- The frontend must not store provider keys in localStorage, sessionStorage, IndexedDB, committed files, or browser-accessible settings.
- Production browser requests should target `VITE_API_BASE_URL`; do not rely on a Static Site `/api` proxy unless an external rewrite/proxy has been deliberately configured and verified.
- `ALLOWED_ORIGINS` should include the deployed Static Site URL in production, not `*`.
- API routes should validate request bodies before provider calls.
- API error responses should normalize provider failures and avoid returning raw provider metadata that might include sensitive request details.
- Provider model IDs should remain server-side configuration, not hard-coded into React components.

## Pre-Deploy Verification Checklist

Run these checks before connecting or syncing the Render Blueprint:

- `git status --short` shows only intentional deployment-doc/config changes.
- `test -d apps/web && test -d apps/api && test -d packages/shared`
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build:web`
- `npm run build:api`
- `npm run build`
- `npm run lint`
- Run the secret-surface scan:

```bash
rg 'openaiApiKey|Authorization: `Bearer|VITE_.*KEY|localStorage.*apiKey|GEMINI_API_KEY' apps packages README.md render.yaml .env.example
```

- Confirm any `GEMINI_API_KEY` matches are limited to API env handling, `.env.example`, docs, or Render config.
- Confirm the web bundle does not contain Gemini or Google API keys.
- Confirm the Static Site has the `/* -> /index.html` rewrite.
- Confirm production web config uses `VITE_API_BASE_URL` for the deployed API origin.
- Confirm `VITE_API_PROXY_TARGET`, if present, is documented and used only for local development.
- Confirm the Static Site is not relying on an implicit `/api` proxy to reach the backend.
- Confirm the API service has `ALLOWED_ORIGINS` set to the exact deployed Static Site URL, not `*`.
- Confirm Render created `agorase-fashion-os-db` in Frankfurt.
- Confirm API env has `DATABASE_URL` from `agorase-fashion-os-db` with `property: connectionString`.
- Confirm the API health endpoint returns provider readiness without exposing secret values.
- Confirm live `GET /api/partners` returns `{ "partners": [...] }` or an empty array.
- Confirm browser requests go to the deployed API service, not directly to Google provider endpoints.
- Confirm provider errors are redacted before they reach browser responses or Render logs intended for routine diagnostics.
- Confirm deployment logs do not print full request bodies, API keys, Authorization headers, provider raw responses, or environment dumps.

## Blueprint Setup Notes

- Keep `GEMINI_API_KEY` and `ALLOWED_ORIGINS` as `sync: false` values and enter them during the initial Render Blueprint creation flow.
- Render ignores `sync: false` values when updating an existing Blueprint, so add any new secrets manually to existing services.
- Use a single Blueprint to manage these services to avoid configuration drift between multiple Blueprint syncs.
