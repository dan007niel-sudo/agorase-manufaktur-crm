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

Deploy the frontend as a Render Static Site from `apps/web/dist`. Deploy the backend as a Render Web Service. Set Gemini secrets only on the API service.

Recommended API settings:

- Build command: `npm install && npm run build:api`
- Start command: `npm run start -w @agorase/api`
- Health check path: `/api/health`
- Secret env: `GEMINI_API_KEY`
- CORS env: `ALLOWED_ORIGINS=https://your-static-site.onrender.com`

Recommended web settings:

- Build command: `npm install && npm run build:web`
- Publish directory: `apps/web/dist`
- SPA rewrite: `/*` to `/index.html`
- Public env: `VITE_API_BASE_URL=https://your-api-service.onrender.com`

`VITE_API_PROXY_TARGET` is local-development-only. Production browser calls should use `VITE_API_BASE_URL`.

See `docs/deployment/render-readiness.md` for the deployment checklist.
