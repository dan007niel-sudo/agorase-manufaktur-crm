# Agorase Fashion OS Completion Design

## Goal

Finish Agorase Fashion OS as a private, admin-only operating system for sourcing, evaluating, producing, launching, and operating a curated fashion brand/marketplace workflow.

The application is considered complete when every sidebar area is useful, persistent, and connected to the secure API:

- Command Center
- Sourcing
- Partners
- Production
- Creative Lab
- Mockups
- Legal Orientation
- Releases
- Web Ops
- Settings

## Current State

Already live:

- Render web and API deployments.
- Render Postgres persistence for partner records.
- Secure Gemini API proxy for partner research.
- Admin login with API-issued `HttpOnly` session cookie.
- Protected product API routes.

Still incomplete:

- Most non-CRM sidebar sections are foundation placeholders.
- `App.tsx` contains too much app logic and UI in one file.
- Tasks are still local-storage state instead of persisted operational records.
- Production, creative, mockups, legal, releases, web ops, settings, export, and backup workflows are not yet backed by data models and routes.
- Image generation and creative brainstorming API routes exist as placeholders.

## Product Shape

### Command Center

The Command Center should become the daily operator view. It should aggregate open follow-ups, production blockers, creative tasks, release readiness, legal review flags, and web ops tasks. It should answer: "What should I do next today?"

### Sourcing And Partners

Sourcing and Partners remain the core CRM. The current partner table should be preserved and extended only where it materially supports downstream work. The CRM should gain contact history, evaluation scorecards, tags, and links to production and release records.

### Production

Production should track partner capabilities, sample requests, MOQ, lead time, certifications, materials, quality notes, costs, and readiness decisions. It should make it obvious which partners can support which product direction.

### Creative Lab

Creative Lab should manage briefs, concept directions, prompt libraries, capsule ideas, visual-language notes, and AI brainstorming results. It should store generated concepts instead of leaving them as transient UI output.

### Mockups

Mockups should turn prompts, briefs, and optional reference notes into server-routed image-generation jobs. The first complete version can store generated image metadata and remote/base64 asset references conservatively, without building a full digital asset manager.

### Legal Orientation

Legal Orientation should provide non-lawyer operational checklists, risk flags, jurisdictions, review status, and source links. It must clearly avoid pretending to be legal advice.

### Releases

Releases should manage collections/drops, launch dates, readiness states, linked partners, product ideas, content status, and launch tasks.

### Web Ops

Web Ops should track website copy, SEO notes, publishing checklists, deployment readiness, and open web tasks for each release or product initiative.

### Settings

Settings should expose admin-only operational tools: provider health, export/import, backup guidance, seed data controls, logout, and deployment diagnostics.

## Architecture

Keep the current monorepo:

- `packages/shared`: shared contracts, enums, request/response shapes.
- `apps/api`: auth-protected routes, repositories, migrations, provider adapters.
- `apps/web`: React/Vite UI, API clients, section components.

Implementation should move from one large `App.tsx` toward focused modules:

- `apps/web/src/app/` for app shell and auth state.
- `apps/web/src/sections/` for section-level UI.
- `apps/web/src/api/` for API clients.
- `apps/web/src/components/` for reusable UI primitives.

The API should follow the existing repository pattern:

- migration-backed tables in `apps/api/src/db/schema.sql`
- one repository file per domain when domain behavior is nontrivial
- one route file per domain
- shared response types in `packages/shared/src/api.ts` or focused shared files

## Data Model Direction

Add persistent records incrementally:

- `partner_events`: contact notes, calls, emails, follow-ups, attachments as links.
- `partner_evaluations`: scorecards for fit, quality, terms, risk, production readiness.
- `production_profiles`: partner-specific production capabilities.
- `tasks`: operational tasks across sections.
- `creative_briefs`: briefs and saved AI directions.
- `mockup_jobs`: image generation requests and results.
- `legal_notes`: risk checklist items and source links.
- `releases`: drops, collections, dates, statuses.
- `web_ops_items`: SEO/copy/publishing tasks.

Avoid multi-user tenancy, billing, public accounts, payment flows, or customer-facing storefront work in this completion pass.

## Security And Deployment

Keep all provider and admin secrets API-only:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Every new product route must stay behind the existing session-cookie guard except:

- `GET /api/health`
- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `OPTIONS` preflight

## Testing Strategy

Use TDD for each feature phase:

- Shared contract tests where useful.
- API route tests for validation, auth, persistence behavior, and error responses.
- Repository tests for mapping between Postgres rows and shared contracts.
- Web client tests for request shape and credentials.
- React tests only for critical section behavior where they add real confidence.

Before every merge/deploy:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

## Completion Criteria

The application is complete when:

- Every sidebar section has persistent data and at least one real operational workflow.
- Admin login gates the entire app.
- Core workflows survive reloads and deploys.
- API routes are protected and tested.
- The web bundle contains no secrets.
- Render deployment is green.
- Live smoke tests confirm login, protected data access, partner persistence, and at least one workflow in each major area.
