# Phase 3B Operational Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent operational tasks, partner events, and partner evaluations behind the existing admin-authenticated API, and replace local-storage task completion with persisted task status.

**Architecture:** Add shared operation contracts, append migration-backed tables to `schema.sql`, implement one repository and route per domain, wire repositories into `handleRequest`, and add web API clients. Keep UI changes narrow: Command Center continues to show derived partner follow-up tasks, but completion state is saved as persistent task records.

**Tech Stack:** TypeScript, React/Vite, Node HTTP API, Postgres via `pg`, Vitest.

---

## File Structure

- Create `packages/shared/src/operations.ts`: task, partner event, and evaluation contracts plus response shapes.
- Modify `packages/shared/src/index.ts`: export operations contracts.
- Modify `apps/api/src/db/schema.sql`: add `tasks`, `partner_events`, and `partner_evaluations` tables.
- Create `apps/api/src/db/tasksRepository.ts` and `.test.ts`.
- Create `apps/api/src/db/partnerEventsRepository.ts` and `.test.ts`.
- Create `apps/api/src/db/partnerEvaluationsRepository.ts` and `.test.ts`.
- Create `apps/api/src/routes/tasks.ts`.
- Create `apps/api/src/routes/partnerEvents.ts`.
- Create `apps/api/src/routes/partnerEvaluations.ts`.
- Modify `apps/api/src/index.ts`: add repositories to context, protect routes, and route requests.
- Modify `apps/api/src/server.test.ts`: cover authenticated and unauthenticated new routes.
- Create `apps/web/src/api/tasksApi.ts` and `.test.ts`.
- Create `apps/web/src/api/partnerEventsApi.ts` and `.test.ts`.
- Create `apps/web/src/api/partnerEvaluationsApi.ts` and `.test.ts`.
- Modify `apps/web/src/App.tsx`: load task records, overlay completion by id, save toggles through the API, remove local-storage task completion.
- Modify `apps/web/src/app/authState.ts`: remove unused `completedTasks` storage key if no longer used.

## Task 1: Shared Contracts And RED Tests

- [ ] Create failing tests/imports for operation contracts and API clients.
- [ ] Run focused tests and verify they fail due to missing modules.
- [ ] Implement shared `operations.ts` contracts and exports.
- [ ] Implement web API clients with `credentials: 'include'`.
- [ ] Verify focused tests pass.

## Task 2: Repository Layer

- [ ] Write failing repository tests for task/event/evaluation row mapping and validation.
- [ ] Run repository tests and verify RED.
- [ ] Append tables and indexes to `schema.sql`.
- [ ] Implement task/event/evaluation repositories.
- [ ] Verify repository tests pass.

## Task 3: Protected API Routes

- [ ] Write failing server tests for auth protection and authenticated routing.
- [ ] Run server tests and verify RED.
- [ ] Implement routes and wire repositories into `handleRequest`.
- [ ] Verify server tests pass.

## Task 4: Persist Command Center Task Completion

- [ ] Load persisted tasks after authenticated partner load.
- [ ] Overlay persisted task completion onto derived tasks by task id.
- [ ] Save task status on checkbox toggle through `/api/tasks/:id`.
- [ ] Remove local-storage completion state.
- [ ] Run web client tests and typecheck.

## Task 5: Full Verification And Commit

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Run `rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true`.
- [ ] Review `git diff --stat`.
- [ ] Commit as `feat: add persistent operational records`.
