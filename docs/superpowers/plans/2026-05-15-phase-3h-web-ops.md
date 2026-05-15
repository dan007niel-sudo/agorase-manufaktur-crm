# Phase 3H Web Ops Implementation Plan

**Goal:** Ship the Web Ops workspace described in `2026-05-15-phase-3h-web-ops-design.md`.

**Approach:** Mirror the Phase 3G Releases pattern exactly. Single-domain table, repository, route, web API client, view, and Command Center derivation. TDD per task.

## File-by-file Steps (TDD order)

### 1. Shared Contracts

- [x] Create `packages/shared/src/webOps.ts` with `WebOpsKind`, `WebOpsStatus`, `WEB_OPS_KINDS`, `WEB_OPS_STATUSES`, `WebOpsChecklistItem`, `WebOpsItem`, `WebOpsItemInput`, `WebOpsItemsResponse`, `WebOpsItemResponse`.
- [x] Re-export `./webOps.js` from `packages/shared/src/index.ts`.

### 2. Database Schema

- [x] Append `web_ops_items` table and three indexes to `apps/api/src/db/schema.sql`.
- [x] Confirmed migration runner picks up new statements at startup (`runMigrations` runs the full file with `if not exists` semantics).

### 3. Repository

- [x] Write `apps/api/src/db/webOpsItemsRepository.test.ts` first:
  - row mapping
  - checklist JSON parsing (object, JSON string, null, garbage)
  - input validation (missing title, bad kind, bad status)
  - list ordering
  - list filters (release/kind/status)
  - upsert SQL shape
  - delete shape
- [x] Implement `apps/api/src/db/webOpsItemsRepository.ts`:
  - `mapWebOpsItemRow`, `normalizeWebOpsItemInput`, `listWebOpsItems`, `getWebOpsItem`, `upsertWebOpsItem`, `deleteWebOpsItem`, `createPostgresWebOpsItemsRepository`.

### 4. API Route

- [x] Create `apps/api/src/routes/webOps.ts` exporting `webOpsRoute` and `WebOpsItemsRepository` interface.
- [x] Support `GET /api/web-ops`, `POST /api/web-ops`, `GET /api/web-ops/:id`, `PUT /api/web-ops/:id`, `PATCH /api/web-ops/:id` (merge onto existing), `DELETE /api/web-ops/:id`.
- [x] Wire into `apps/api/src/index.ts`:
  - import repository/route
  - add `webOpsItemsRepository` to `ApiContext`
  - add web-ops paths to `isProtectedPath`
  - dispatch to `webOpsRoute`
  - construct Postgres repository in startup wiring
- [x] Extend `apps/api/src/server.test.ts` with: auth rejection, list with filters, create, 404, get one, PUT-by-id (id from path), PATCH merge, DELETE.

### 5. Web API Client

- [x] Write `apps/web/src/api/webOpsApi.test.ts`:
  - listWebOpsItems with no filters
  - listWebOpsItems with filters → query string with `release=`, `kind=`, `status=`
  - get/create/update/delete with `credentials: 'include'` and encoded ids
- [x] Implement `apps/web/src/api/webOpsApi.ts` mirroring `releasesApi.ts`.

### 6. Command Center Derivation

- [x] Write `apps/web/src/sections/webOps/webOpsTasks.test.ts`:
  - blocked items become `Web Ops Blocker: …`
  - deployment-check items become `Web Ops: …`
  - non-blocking non-deploy items skipped
  - shipped items skipped
  - persisted completion mirrored
  - urgency derived from `dueDate` vs `today`
- [x] Implement `apps/web/src/sections/webOps/webOpsTasks.ts`.

### 7. UI

- [x] Create `apps/web/src/sections/webOps/WebOpsView.tsx`:
  - list with kind/status/release filters
  - editor for title, kind, status, release link, due date, owner, target URL, summary, body, notes
  - SEO sub-panel (title, description, keywords)
  - checklist editor (add, toggle, rename, remove)
  - delete button
- [x] Add web-ops layout styles to `apps/web/src/App.css` mirroring release styles.

### 8. App Wiring

- [x] In `apps/web/src/App.tsx`:
  - import `WebOpsView`, `createWebOpsCommandTasks`, `listWebOpsItems`, `WebOpsItem`
  - hold `webOpsItems` state
  - load alongside other workspace data
  - concat into `tasks` for Command Center
  - replace `WorkspaceFoundation` placeholder for `Web Ops`

### 9. Verification

- [x] `npm test` — 28 files / 148 tests pass
- [x] `npm run typecheck` — clean
- [x] `npm run build` — clean (web bundle ~248 KB JS, 13 KB CSS)
- [x] `npm run lint` — clean
- [x] Secret scan empty

## Out of Scope (carried forward)

- React render test for the section (Releases has none; staying consistent).
- Per-checklist-item drag/reorder UI.
- Generating publishing previews or live deploy hooks.
- Schema FK constraints / proper `date` typing (would require a project-wide migration).

## Deviations from the Brief

- `release_id` stored as `text default ''` without a foreign key (matches existing tables; brief asked for `text references releases(id) on delete set null`).
- `due_date` stored as `text` (matches every other date column in the schema; brief asked for `date`).

Both deviations preserve internal consistency with the rest of the project. They are flagged so a future "schema hardening" phase can address them holistically.
