# Agorase Fashion OS Completion Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Agorase Fashion OS so every sidebar area is persistent, useful, protected, tested, and deployed.

**Architecture:** Continue the existing React/Vite + Node API + Render Postgres monorepo. Build in small phases: data foundation first, then section workflows, then AI/image features, then polish and live verification. Each phase gets its own detailed child plan before implementation.

**Tech Stack:** TypeScript, React 19, Vite, Node HTTP API, Postgres via `pg`, Vitest, Render.

---

## Scope Rule

This master plan is intentionally a decomposition plan. Do not implement all phases from this file directly. For each phase, first create a focused spec and detailed implementation plan under `docs/superpowers/specs/` and `docs/superpowers/plans/`, then execute that child plan with TDD.

## Current Baseline

Completed:

- Phase 1: deployed web/API, secure Gemini proxy.
- Phase 2A: persistent partners in Render Postgres.
- Phase 2B: admin login with `HttpOnly` session cookie and protected API routes.

Current missing areas:

- Production: partial pipeline board only.
- Creative Lab: placeholder only.
- Mockups: placeholder route and placeholder UI only.
- Legal Orientation: placeholder only.
- Releases: placeholder only.
- Web Ops: placeholder only.
- Settings: seed/logout only.
- App architecture: `App.tsx` is too large for the next set of features.

## Phase 3A: App Architecture And Shared UI Foundation

**Goal:** Split the web app into maintainable files before adding more sections.

**Files likely touched:**

- `apps/web/src/App.tsx`
- `apps/web/src/App.css`
- Create `apps/web/src/app/AppShell.tsx`
- Create `apps/web/src/app/authState.ts`
- Create `apps/web/src/components/Panel.tsx`
- Create `apps/web/src/components/FormControls.tsx`
- Create `apps/web/src/sections/command/CommandCenter.tsx`
- Create `apps/web/src/sections/sourcing/SourcingView.tsx`
- Create `apps/web/src/sections/partners/PartnersView.tsx`
- Create `apps/web/src/sections/settings/SettingsView.tsx`

**Tasks:**

- [ ] Write a child spec for app architecture cleanup.
- [ ] Write a child implementation plan with exact move/refactor steps.
- [ ] Add regression tests around auth client and partner API behavior before refactor.
- [ ] Extract auth gate and app shell without changing behavior.
- [ ] Extract existing active sections without changing behavior.
- [ ] Keep CSS behavior stable and remove duplicate legacy files if confirmed unused.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, `npm run lint`.
- [ ] Commit as `refactor: split web app shell and sections`.

## Phase 3B: Operational Data Foundation

**Goal:** Add generic persistent operational records that other sections can reuse.

**Data records:**

- Tasks
- Partner events/contact history
- Partner evaluations

**Files likely touched:**

- `packages/shared/src/operations.ts`
- `packages/shared/src/api.ts`
- `apps/api/src/db/schema.sql`
- `apps/api/src/db/tasksRepository.ts`
- `apps/api/src/db/partnerEventsRepository.ts`
- `apps/api/src/db/partnerEvaluationsRepository.ts`
- `apps/api/src/routes/tasks.ts`
- `apps/api/src/routes/partnerEvents.ts`
- `apps/api/src/routes/partnerEvaluations.ts`
- `apps/api/src/index.ts`
- `apps/web/src/api/tasksApi.ts`
- `apps/web/src/api/partnerEventsApi.ts`
- `apps/web/src/api/partnerEvaluationsApi.ts`

**Tasks:**

- [ ] Write child spec for operational records.
- [ ] Write child implementation plan with migrations and tests.
- [ ] Add failing repository tests for task/event/evaluation row mapping.
- [ ] Add failing API tests for auth-protected CRUD behavior.
- [ ] Implement schema additions.
- [ ] Implement repositories and routes.
- [ ] Implement web API clients with `credentials: 'include'`.
- [ ] Replace local-storage task completion with persisted tasks.
- [ ] Run full verification.
- [ ] Commit as `feat: add persistent operational records`.

## Phase 3C: Production Workspace

**Goal:** Make Production a real workspace for capabilities, samples, costs, MOQ, lead time, and readiness.

**Data records:**

- Production profiles per partner
- Sample requests
- Production readiness score

**Tasks:**

- [ ] Write child spec for production workflows.
- [ ] Write child implementation plan.
- [ ] Add shared production contracts.
- [ ] Add schema/repository/API route tests first.
- [ ] Implement API routes under `/api/production/*`.
- [ ] Build `ProductionView` with capability editor, sample tracker, and readiness panel.
- [ ] Link partner detail to production profile.
- [ ] Add Command Center production blockers.
- [ ] Verify and commit as `feat: build production workspace`.

## Phase 3D: Creative Lab

**Goal:** Store briefs and AI-generated creative directions as persistent records.

**Data records:**

- Creative briefs
- Saved directions
- Prompt templates

**Tasks:**

- [ ] Write child spec for Creative Lab.
- [ ] Write child implementation plan.
- [ ] Replace placeholder `/api/visualize` behavior with Gemini-backed brainstorming.
- [ ] Add persistence for briefs and saved directions.
- [ ] Build Creative Lab UI for brief input, saved concepts, and prompt library.
- [ ] Add tests for provider redaction and malformed provider output.
- [ ] Verify and commit as `feat: build creative lab`.

## Phase 3E: Mockups

**Goal:** Turn mockup generation into a real admin workflow.

**Data records:**

- Mockup jobs
- Generated asset metadata
- Prompt/reference notes

**Tasks:**

- [ ] Write child spec for mockups and asset storage limits.
- [ ] Write child implementation plan.
- [ ] Implement `/api/mockups/generate` as a real provider-backed route.
- [ ] Store job status and image metadata conservatively.
- [ ] Build Mockups UI for prompt, aspect ratio, quality, history, and result preview.
- [ ] Add provider failure and no-secret-leak tests.
- [ ] Verify generated assets render in browser.
- [ ] Verify and commit as `feat: build mockup generation workspace`.

## Phase 3F: Legal Orientation

**Goal:** Provide non-lawyer legal/risk organization without pretending to provide legal advice.

**Data records:**

- Legal notes
- Risk checklist items
- Source links
- Review status

**Tasks:**

- [ ] Write child spec for Legal Orientation.
- [ ] Write child implementation plan.
- [ ] Add shared legal contracts and API persistence.
- [ ] Build legal checklist UI with jurisdiction, risk level, status, source links, and next action.
- [ ] Add visible non-advice wording in appropriate UI copy.
- [ ] Add Command Center risk flags.
- [ ] Verify and commit as `feat: build legal orientation workspace`.

## Phase 3G: Releases

**Goal:** Manage collections/drops from idea through launch.

**Data records:**

- Releases
- Release tasks
- Linked partners
- Content readiness status

**Tasks:**

- [ ] Write child spec for Releases.
- [ ] Write child implementation plan.
- [ ] Add schema/repository/API for releases.
- [ ] Build release list, release detail, readiness checklist, linked partners, and launch calendar.
- [ ] Add Command Center upcoming launch tasks.
- [ ] Verify and commit as `feat: build release planning workspace`.

## Phase 3H: Web Ops

**Goal:** Track SEO, copy, publishing, and deployment readiness for releases and product pages.

**Data records:**

- Web ops items
- Page/copy briefs
- SEO notes
- Publishing checklist state

**Tasks:**

- [ ] Write child spec for Web Ops.
- [ ] Write child implementation plan.
- [ ] Add schema/repository/API for web ops.
- [ ] Build Web Ops UI for page briefs, SEO metadata, content status, and launch tasks.
- [ ] Link Web Ops items to releases where useful.
- [ ] Verify and commit as `feat: build web ops workspace`.

## Phase 3I: Settings, Export, Backup, And Diagnostics

**Goal:** Make Settings an admin operations center.

**Tasks:**

- [ ] Write child spec for Settings operations.
- [ ] Write child implementation plan.
- [ ] Add JSON export endpoint for all admin data.
- [ ] Add targeted import/restore guidance, but avoid unsafe destructive restore until explicitly designed.
- [ ] Add provider health cards for Gemini text/image and database readiness.
- [ ] Add deployment checklist status and environment expectation copy.
- [ ] Verify and commit as `feat: add admin data tools`.

## Phase 3J: Product Polish, QA, And Live Completion

**Goal:** Make the application feel complete and reliable.

**Tasks:**

- [ ] Write child spec for final QA and polish.
- [ ] Write child implementation plan.
- [ ] Review all empty/loading/error states.
- [ ] Review responsive layouts across mobile and desktop.
- [ ] Add accessibility fixes for labels, button names, and focus order.
- [ ] Remove unused assets and duplicate files after verification.
- [ ] Run full verification.
- [ ] Deploy to Render.
- [ ] Live smoke-test login, partners, production, creative, mockups, legal, releases, web ops, settings export, and web bundle secret scan.
- [ ] Update `SESSION_HANDOFF.md`.
- [ ] Commit as `docs: mark completion readiness`.

## Recommended Execution Order

1. Phase 3A: architecture cleanup
2. Phase 3B: operational data foundation
3. Phase 3C: production workspace
4. Phase 3G: releases
5. Phase 3H: web ops
6. Phase 3D: creative lab
7. Phase 3E: mockups
8. Phase 3F: legal orientation
9. Phase 3I: settings/export/diagnostics
10. Phase 3J: final QA and live completion

Reasoning: production and releases are core business operations, web ops depends naturally on releases, creative/mockups can then plug into release/product workflows, legal and settings round out operational safety.

## Verification Gate For Every Phase

Run before merge/push:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Expected:

- all tests pass
- typecheck passes
- build passes
- lint passes
- secret scan has no output

## Next Immediate Work

Start Phase 3A in a fresh worktree:

```bash
git status --short --branch
git worktree list
git worktree add .worktrees/phase-3a-app-architecture -b codex/phase-3a-app-architecture
```

Then create:

- `docs/superpowers/specs/2026-05-15-phase-3a-app-architecture-design.md`
- `docs/superpowers/plans/2026-05-15-phase-3a-app-architecture.md`

Do not start adding new product features until Phase 3A has reduced the size and coupling of `apps/web/src/App.tsx`.
