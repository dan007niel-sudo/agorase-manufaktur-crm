# Phase 2A Persistent Partners Design

## Goal

Phase 2A turns Agorase Fashion OS from a browser-local demo into a persistent CRM surface for sourcing and partner work. The first durable product object is the manufactory/partner record that currently lives in `localStorage`.

This phase deliberately does not add login. It prepares the data and API shape that Phase 2B can protect with auth and per-user or per-workspace ownership.

## Current State

- The deployed frontend is a React/Vite static site on Render.
- The deployed API is a Node service on Render.
- Gemini provider calls are already proxied through the API and configured server-side.
- CRM records, task completion, and templates are stored in browser `localStorage`.
- The UI uses `Manufactory` records from `apps/web/src/types.ts`.
- The API has no database dependency yet.

## Recommended Approach

Use Render Postgres as the Phase 2A database because the application is already hosted on Render and the current deployment is managed by `render.yaml`. The API service should own all database access. The browser should never connect directly to Postgres.

The API will expose a small partner-record contract:

- `GET /api/partners`
- `POST /api/partners`
- `PUT /api/partners/:id`
- `DELETE /api/partners/:id`
- `POST /api/partners/import`

The frontend will replace direct `localStorage` record persistence with API-backed loading and saving. It can keep a local fallback only for transient UI resilience when the API request fails.

## Data Model

Create a `partners` table that maps closely to the existing `Manufactory` shape:

- `id` text primary key
- `name` text not null
- `contact_person` text not null default empty string
- `category` text not null
- `city` text not null default empty string
- `region` text not null default empty string
- `country` text not null default empty string
- `website` text not null default empty string
- `email` text not null default empty string
- `phone` text not null default empty string
- `social` text not null default empty string
- `products` text not null default empty string
- `price_level` text not null
- `brand_fit` text not null
- `cooperation_potential` text not null
- `status` text not null
- `priority` text not null
- `source` text not null default empty string
- `last_contact` text not null default empty string
- `next_follow_up` text not null default empty string
- `next_step` text not null default empty string
- `notes` text not null default empty string
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Keep enum validation in TypeScript first. Database-level check constraints can be added in a later hardening pass once the product vocabulary settles.

## API Behavior

### `GET /api/partners`

Returns all partner records ordered by `updated_at desc`, then `name asc`.

Response:

```json
{
  "partners": []
}
```

### `POST /api/partners`

Creates or replaces one partner record. The API normalizes empty optional fields to empty strings and rejects invalid category, status, price level, fit score, potential, or priority values.

Response:

```json
{
  "partner": {}
}
```

### `PUT /api/partners/:id`

Updates an existing partner by id. Missing fields keep their current values. Invalid enum values are rejected.

Response:

```json
{
  "partner": {}
}
```

### `DELETE /api/partners/:id`

Deletes one partner by id. Deleting a missing id returns success with `204` so repeated UI actions are safe.

### `POST /api/partners/import`

Accepts an array of partner records from AI research or bulk import. Existing ids are updated, new ids are inserted.

Response:

```json
{
  "partners": []
}
```

## Frontend Behavior

On app load, the frontend fetches partners from `GET /api/partners`.

- If the database has records, those records become the working CRM dataset.
- If the database is empty, the frontend shows the existing seed records and a "Seed speichern" action in Settings. It does not auto-write seed data.
- If the API is unavailable, the frontend shows a non-blocking error state and falls back to the last local in-memory records for the current session.

Record create, edit, AI import, and bulk import should call the API. The UI should update optimistically only after a successful response in Phase 2A. This keeps behavior simple and avoids conflict resolution before auth/workspaces exist.

Task completion can remain in `localStorage` for Phase 2A. Templates can remain in seed data/local state. Those are smaller follow-up persistence candidates after partner records are durable.

## Environment And Deployment

Add a Render Postgres database to `render.yaml` and connect it to the API service through a server-only `DATABASE_URL` environment variable.

Required API env:

- `DATABASE_URL`
- existing `GEMINI_API_KEY`
- existing `ALLOWED_ORIGINS`

The web service receives no database credentials.

Migration execution should happen during API startup using a small idempotent migration script. Phase 2A should keep this simple: one SQL migration file plus a Node script that runs it against `DATABASE_URL` before the HTTP server starts accepting requests.

## Error Handling

API errors should remain normalized:

- invalid input: `400`
- database unavailable: `503`
- not found on update: `404`
- unexpected failures: `500`

Responses should not expose database connection strings, SQL text with user data, provider keys, or raw stack traces.

The frontend should show short user-facing errors near the affected workflow:

- partner list load failed
- partner save failed
- import failed

## Testing

API tests should cover:

- environment loading for `DATABASE_URL`
- partner validation
- SQL row to API object mapping
- API route success and failure paths
- import upsert behavior

Frontend tests should cover:

- loading partners from the API
- saving edited records through the API
- importing AI records through the API
- showing a recoverable load/save error

Deployment checks should cover:

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint`
- live `/api/health`
- live `GET /api/partners`

## Out Of Scope

- Login and roles
- per-user or per-workspace data isolation
- advanced audit log
- attachment uploads
- full template persistence
- task persistence beyond current browser state
- provider-side research result normalization beyond what already exists

## Phase 2B Preparation

Design the database/API boundary so Phase 2B can add auth without rewriting the frontend workflows:

- keep all database access behind API routes
- avoid browser-side secrets
- keep API response shapes explicit
- keep `workspace_id` out of Phase 2A unless auth is introduced
- leave room to add `owner_id` or `workspace_id` columns in a later migration
