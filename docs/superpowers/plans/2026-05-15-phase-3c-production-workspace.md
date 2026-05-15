# Phase 3C Production Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent Production workspace with partner production profiles, sample request tracking, and readiness/blocker visibility.

**Architecture:** Add shared production contracts, append production tables to the existing migration file, implement Postgres repositories and protected API routes under `/api/production/*`, then replace the Production placeholder with a React workspace that loads and saves production data through credentialed web clients.

**Tech Stack:** TypeScript, React/Vite, Node HTTP API, Postgres via `pg`, Vitest.

---

## File Structure

- Create `packages/shared/src/production.ts` and export it from `packages/shared/src/index.ts`.
- Modify `apps/api/src/db/schema.sql`.
- Create `apps/api/src/db/productionProfilesRepository.ts` and `.test.ts`.
- Create `apps/api/src/db/sampleRequestsRepository.ts` and `.test.ts`.
- Create `apps/api/src/routes/production.ts`.
- Modify `apps/api/src/index.ts` and `apps/api/src/server.test.ts`.
- Create `apps/web/src/api/productionApi.ts` and `.test.ts`.
- Modify `apps/web/src/sections/production/ProductionView.tsx`.
- Modify `apps/web/src/App.tsx` to add production blocker tasks to Command Center.
- Modify `apps/web/src/App.css` only for necessary Production layout controls.

## Task 1: Contracts And Web Client RED/GREEN

- [ ] Write failing production API client tests for credentials, profile save, sample create/update/delete.
- [ ] Add shared production types and response shapes.
- [ ] Implement `productionApi.ts`.
- [ ] Verify focused client tests pass.

## Task 2: Repository RED/GREEN

- [ ] Write failing repository tests for production profiles and sample requests.
- [ ] Add production tables and indexes to `schema.sql`.
- [ ] Implement repositories with validation, mapping, list filters, upsert/update/delete.
- [ ] Verify repository tests pass.

## Task 3: Protected API Routes

- [ ] Add failing server tests for unauthenticated rejection and authenticated production profile/sample routing.
- [ ] Implement `/api/production/*` route file and wire it into `handleRequest`.
- [ ] Verify server tests pass.

## Task 4: Production UI

- [ ] Replace the foundation panel with a production profile editor, readiness panel, and sample tracker.
- [ ] Load profiles and samples when the section mounts.
- [ ] Persist profile and sample edits through `productionApi`.
- [ ] Add production blocker tasks for blocked profiles into Command Center derived tasks.
- [ ] Verify typecheck and focused tests.

## Task 5: Full Verification And Commit

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Run `rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true`.
- [ ] Review diff and commit as `feat: build production workspace`.
