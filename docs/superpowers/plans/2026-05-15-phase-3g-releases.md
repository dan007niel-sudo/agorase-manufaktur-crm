# Phase 3G Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent Releases workspace for drops/collections, launch tasks, linked partners, and readiness status.

**Architecture:** Add shared release contracts, append release tables to the existing migration file, implement Postgres repositories and protected API routes under `/api/releases*`, then replace the Releases placeholder with a React workspace that loads and saves releases, tasks, and partner links.

**Tech Stack:** TypeScript, React/Vite, Node HTTP API, Postgres via `pg`, Vitest.

---

## File Structure

- Create `packages/shared/src/releases.ts` and export it.
- Modify `apps/api/src/db/schema.sql`.
- Create `apps/api/src/db/releasesRepository.ts` and `.test.ts`.
- Create `apps/api/src/db/releaseTasksRepository.ts` and `.test.ts`.
- Create `apps/api/src/db/releasePartnersRepository.ts` and `.test.ts`.
- Create `apps/api/src/routes/releases.ts`.
- Modify `apps/api/src/index.ts` and `apps/api/src/server.test.ts`.
- Create `apps/web/src/api/releasesApi.ts` and `.test.ts`.
- Create `apps/web/src/sections/releases/ReleasesView.tsx`.
- Modify `apps/web/src/App.tsx` to render Releases and add release tasks to Command Center.
- Modify `apps/web/src/App.css` only for Releases layout.

## Tasks

- [x] Write RED tests for release API clients and repositories.
- [x] Implement shared contracts and web client.
- [x] Implement schema and repositories.
- [x] Add protected routes and server tests.
- [x] Build Releases UI with release editor, task checklist, and linked partner controls.
- [x] Add Command Center release task aggregation.
- [x] Run full verification and commit as `feat: build release planning workspace`.
