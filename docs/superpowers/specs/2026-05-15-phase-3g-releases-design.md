# Phase 3G Releases Design

## Goal

Make Releases a persistent planning workspace for collections/drops from idea through launch.

## Current State

- Releases is still a foundation placeholder.
- Partners, operational tasks, and Production profiles are persistent.
- Command Center can aggregate CRM follow-ups and production blockers.

## Data Model

### Release

- `id`
- `name`
- `season`
- `launchDate`
- `status`: `idea`, `planning`, `production`, `content`, `ready`, `launched`
- `summary`
- `contentStatus`: `not_started`, `drafting`, `review`, `ready`
- `readinessNotes`
- `createdAt`
- `updatedAt`

### Release Task

- `id`
- `releaseId`
- `title`
- `status`: `open`, `done`
- `owner`
- `dueDate`
- `notes`
- `createdAt`
- `updatedAt`

### Release Partner Link

- `releaseId`
- `partnerId`
- `role`
- `createdAt`

## API

All routes are admin-only:

- `GET /api/releases`
- `POST /api/releases`
- `PUT /api/releases/:id`
- `DELETE /api/releases/:id`
- `GET /api/releases/tasks`
- `POST /api/releases/tasks`
- `PUT /api/releases/tasks/:id`
- `DELETE /api/releases/tasks/:id`
- `GET /api/releases/partners`
- `POST /api/releases/partners`
- `DELETE /api/releases/partners/:releaseId/:partnerId`

Task and partner list routes accept optional `?releaseId=...`.

## Web UI

Releases should show:

- release list
- selected release editor
- readiness/status panel
- release task checklist
- linked partner list and add-partner control

Command Center should surface open release tasks due soon or overdue.

## Completion Criteria

- Shared release contracts are exported.
- Schema, repositories, protected routes, web clients, and tests exist.
- Releases section persists release data, tasks, and partner links.
- Command Center includes release launch tasks.
- Full verification passes and the phase is committed.
