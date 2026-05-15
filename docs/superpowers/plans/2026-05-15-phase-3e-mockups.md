# Phase 3E — Mockups Implementation Plan

## Tasks

1. **Shared contracts**
   - [x] Add `packages/shared/src/mockups.ts` with unions, runtime const arrays, `MockupJob`, `MockupJobInput`, `GenerateMockupRequest`, `GenerateMockupResponse`, list/single response types.
   - [x] Re-export from `packages/shared/src/index.ts`.

2. **Schema**
   - [x] Add `mockup_jobs` table to `apps/api/src/db/schema.sql` with status/brief/release indexes.

3. **Repository**
   - [x] `apps/api/src/db/mockupJobsRepository.ts` with `mapMockupJobRow`, `normalizeMockupJobInput`, `list/get/upsert/delete`, and `createPostgresMockupJobsRepository`.
   - [x] `apps/api/src/db/mockupJobsRepository.test.ts` covering mapping, validation, list filters, ordering, upsert/delete, get.

4. **API route (replaces placeholder)**
   - [x] Replace `apps/api/src/routes/mockups.ts` with full handler covering list, get, delete, generate.
   - [x] Persist `pending` row before provider call; update to `completed` or `failed`.
   - [x] Sanitize provider errors (constants only, never echo upstream URL or key).
   - [x] Enforce 4 MB inline-base64 limit; fall back to URL or mark failed.
   - [x] Wire `MockupJobsRepository` into `ApiContext`; expand `isProtectedPath` to cover `/api/mockups` and `/api/mockups/`.

5. **Tests**
   - [x] `apps/api/src/routes/mockups.test.ts` covering 401 paths, list filters, get/delete, validation, not-configured, inline+URL success, provider 500, no-image case, oversized base64 with and without URL fallback. Verify response strings contain none of `AIza`, `googleapis.com`, `x-goog-api-key`, the test secret.

6. **Web client**
   - [x] `apps/web/src/api/mockupsApi.ts` with `listMockupJobs`, `getMockupJob`, `deleteMockupJob`, `generateMockup`.
   - [x] `apps/web/src/api/mockupsApi.test.ts` covering request shape, credentials, error path, generate.

7. **UI**
   - [x] `apps/web/src/sections/mockups/MockupsView.tsx` with three-column layout, German strings, ratio/quality chips, brief/release selects, history list, detail panel with image rendering and Löschen action.
   - [x] Replace `WorkspaceFoundation` with `MockupsView` in `App.tsx` for the `'Mockups'` section.
   - [x] Load `mockupJobs` in the auth-time `Promise.all`.
   - [x] Update `fashionOs` Mockups status to `'active'` and matching test.

8. **Command Center**
   - [x] `apps/web/src/sections/mockups/mockupTasks.ts` deriving failed/pending tasks with prompt snippet.
   - [x] `apps/web/src/sections/mockups/mockupTasks.test.ts` covering positive and negative cases.
   - [x] Wire into App.tsx Command Center pipeline.

9. **Verification gate**
   - [x] `npm test`, `npm run typecheck`, `npm run build`, `npm run lint`.
   - [x] `rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist` — no matches.
   - [x] `rg 'GEMINI_API_KEY|process\.env\.GEMINI' apps/web/src` — no matches.

## Out of scope (intentional)

- Asset object storage; signed URLs; multi-image jobs; regeneration with the same id; mockup-to-product linking; legal/IP guardrails on generated images.
