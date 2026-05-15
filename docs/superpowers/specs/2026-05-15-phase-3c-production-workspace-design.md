# Phase 3C Production Workspace Design

## Goal

Make the Production section a real persistent workspace for partner capabilities, sample requests, production costs, MOQ, lead time, quality notes, certifications, and readiness decisions.

## Current State

- Production currently shows the partner pipeline board plus a generic foundation panel.
- Partners are persistent.
- Phase 3B added persistent tasks, partner events, and partner evaluations.
- No production-specific profile or sample request data exists.

## Data Model

### Production Profile

One profile per partner:

- `partnerId`
- `capabilities`
- `materials`
- `moq`
- `leadTime`
- `certifications`
- `costNotes`
- `qualityNotes`
- `readinessStatus`: `unknown`, `blocked`, `review`, `ready`
- `readinessScore`: integer 0-100
- `blocker`
- `updatedAt`

### Sample Request

Multiple sample requests per partner:

- `id`
- `partnerId`
- `title`
- `status`: `planned`, `requested`, `received`, `approved`, `rejected`
- `requestedAt`
- `targetDate`
- `costEstimate`
- `notes`
- `createdAt`
- `updatedAt`

## API

All routes are protected by the existing admin session cookie:

- `GET /api/production/profiles`
- `PUT /api/production/profiles/:partnerId`
- `GET /api/production/samples`
- `POST /api/production/samples`
- `PUT /api/production/samples/:id`
- `DELETE /api/production/samples/:id`

List routes accept optional `?partnerId=...` filters.

## Web UI

Production should show:

- current pipeline board
- selected partner production profile editor
- readiness panel
- sample request tracker

The UI should use existing styling classes first and add minimal scoped CSS where necessary.

## Completion Criteria

- Shared production contracts are exported from `@agorase/shared`.
- Schema, repositories, protected routes, and web clients exist with tests.
- Production view persists profile edits and sample requests through the API.
- Command Center can surface production blockers through tasks generated from blocked profiles.
- Full verification passes and the phase is committed.
