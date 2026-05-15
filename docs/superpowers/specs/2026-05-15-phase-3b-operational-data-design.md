# Phase 3B Operational Data Foundation Design

## Goal

Phase 3B adds the first reusable persistent operational records for the remaining Fashion OS sections:

- operational tasks
- partner contact/events history
- partner evaluation scorecards

The current user-facing behavior should remain stable, but Command Center task completion should stop depending on local storage and instead persist through the protected API.

## Current State

- Partner records are persisted in Postgres and protected by the admin session cookie.
- Command Center tasks are derived from partner `nextStep` and `nextFollowUp`.
- Task completion is currently stored in browser `localStorage`.
- There is no persistent contact history or scorecard model yet.
- Phase 3C and later need shared operational records to aggregate blockers, follow-ups, readiness, and review state.

## Data Model

### Operational Task

Represents an actionable item across the app. The first UI integration uses task ids derived from partner follow-ups, but the model is general enough for later sections.

Fields:

- `id`
- `title`
- `section`
- `status`: `open` or `done`
- `priority`: `low`, `medium`, `high`
- `partnerId`
- `dueDate`
- `notes`
- `createdAt`
- `updatedAt`

### Partner Event

Represents contact history or partner timeline notes.

Fields:

- `id`
- `partnerId`
- `type`: `note`, `email`, `call`, `meeting`, `follow_up`, `sample`
- `title`
- `body`
- `eventDate`
- `nextAction`
- `createdAt`
- `updatedAt`

### Partner Evaluation

Represents a lightweight partner scorecard for fit and production readiness.

Fields:

- `id`
- `partnerId`
- `fitScore`
- `qualityScore`
- `termsScore`
- `riskScore`
- `readinessScore`
- `summary`
- `createdAt`
- `updatedAt`

Scores are integers from 1 to 5.

## API

All new routes are admin-only and must use the existing session-cookie protection:

- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/partner-events`
- `POST /api/partner-events`
- `PUT /api/partner-events/:id`
- `DELETE /api/partner-events/:id`
- `GET /api/partner-evaluations`
- `POST /api/partner-evaluations`
- `PUT /api/partner-evaluations/:id`
- `DELETE /api/partner-evaluations/:id`

`partnerId` may be filtered with `?partnerId=...` on event/evaluation list routes.

## Web Integration

- Add `apps/web/src/api/tasksApi.ts`.
- Load persisted tasks after partner records are loaded.
- Overlay persisted task status onto currently derived Command Center tasks by id.
- When a task checkbox is toggled, save a task record via the API.
- If task persistence fails, keep the existing visible sync alert pattern and leave partner data intact.
- Remove local-storage task completion state from `App.tsx`.

Partner events and evaluations get API clients now, but section UI can consume them in Phase 3C and later.

## Security

- No new route is public.
- All web clients use `credentials: 'include'`.
- No secrets are introduced to the web bundle.
- Validation errors return safe messages only.

## Testing

- Repository tests cover row mapping, validation, parameterized SQL, update missing 404s, and delete operations.
- API tests cover unauthenticated rejection and authenticated routing for all new domains.
- Web client tests cover request path, request body, and credentials.
- App integration remains covered through existing build/typecheck and Command Center task type safety.

## Completion Criteria

- Schema contains `tasks`, `partner_events`, and `partner_evaluations`.
- Shared operation types are exported from `@agorase/shared`.
- API repositories and routes are wired into `handleRequest` and production startup context.
- New product routes are protected by auth.
- Command Center task completion persists through the API.
- Full verification passes and the phase is committed.
