# Agorase Fashion OS

Agorase Fashion OS is a clothing-brand operating system for European production sourcing, partner workflows, creative planning, mockups, legal orientation, releases, and web operations.

The product is one repository with two deployment runtimes:

- `apps/web`: React/Vite frontend for the Fashion OS interface.
- `apps/api`: secure Node API service for Gemini and future image-generation provider calls.
- `packages/shared`: shared TypeScript contracts used by web and API.

## Local Development

Install dependencies:

```bash
npm install
```

Run the API service:

```bash
npm run dev:api
```

Run the web app in another terminal:

```bash
npm run dev:web
```

The Vite dev server proxies `/api` to `VITE_API_PROXY_TARGET`, which defaults to `http://localhost:8787`.

### Local Database

For local QA against the real API/repository path, start Postgres with Docker Compose:

```bash
cp .env.example .env
docker compose up -d postgres
```

Set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`, then run `npm run dev:api`. The API runs idempotent migrations at startup against:

```txt
postgresql://postgres:postgres@localhost:5432/agorase_fashion_os
```

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run lint
```

## Environment

Copy `.env.example` for local service configuration as needed. Do not commit real secrets.

`GEMINI_API_KEY` or `GOOGLE_API_KEY` belongs on the API service only. Do not create `VITE_*` variables for provider secrets because Vite exposes those values to the browser bundle.

## Render Deployment

Deploy the frontend as a Render Static Site from `apps/web/dist`. Deploy the backend as a Render Web Service. Set Gemini and auth secrets only on the API service.

The repository includes a Render Blueprint at `render.yaml`.

Phase 2A also provisions Render Postgres through `render.yaml`. The API receives `DATABASE_URL` from the database's internal connection string via `fromDatabase`; the web service never receives database credentials.

Phase 2B protects the app with an API-issued admin session cookie. Set `ADMIN_PASSWORD` and `SESSION_SECRET` only on the API service.

- GitHub repo: `https://github.com/dan007niel-sudo/agorase-manufaktur-crm`
- Blueprint start link: `https://render.com/deploy?repo=https://github.com/dan007niel-sudo/agorase-manufaktur-crm`

Recommended API settings:

- Build command: `npm install && npm run build:api`
- Start command: `npm run start -w @agorase/api`
- Health check path: `/api/health`
- Secret env: `GEMINI_API_KEY`
- Auth secret env: `ADMIN_PASSWORD`, `SESSION_SECRET`
- CORS env: `ALLOWED_ORIGINS=https://your-static-site.onrender.com`
- Database env: `DATABASE_URL` from `agorase-fashion-os-db`

Recommended web settings:

- Build command: `npm install && npm run build:web`
- Publish directory: `apps/web/dist`
- Routes (order matters, see `render.yaml`):
  1. Rewrite `/api/*` to `https://agorase-fashion-os-api.onrender.com/api/*` (same-origin proxy to the API)
  2. Rewrite `/*` to `/index.html` (SPA fallback)
- Public env: `VITE_API_BASE_URL` must be **empty** in production. The web bundle falls back to relative `/api/...` paths, and the Render rewrite above forwards them to the API origin as first-party requests. This is required for iOS/WebKit, which blocks third-party cookies even with `SameSite=None; Secure`.

Initial Blueprint values to enter in Render:

- API service Gemini key: your Gemini API key
- API service allowed-origins: the deployed web Static Site origin
- API service admin password: a strong admin password
- API service session signing secret: a random long string
- Web Static Site `VITE_API_BASE_URL`: leave unset. If it was previously set in the Render dashboard, delete it manually — dashboard values override `render.yaml`.

`VITE_API_PROXY_TARGET` is local-development-only. In production the same-origin rewrite in `render.yaml` handles API routing.

See `docs/deployment/render-readiness.md` for the deployment checklist.
