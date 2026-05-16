# Phase 3I — Settings, Export, Backup, Diagnostics (Plan)

## Order of work

1. **Shared contracts** — `packages/shared/src/admin.ts` with `AdminExportBundle`, `AdminDiagnostics`, `AdminExportDomain`, `AdminExportErrors`. Re-export from `packages/shared/src/index.ts`. Build the shared package (`npm test` does this implicitly).
2. **API export route** — `apps/api/src/routes/adminExport.ts` aggregating all 15 repository `list()` calls in parallel with per-domain `try/catch`, sets `Content-Disposition`. 503 when any required repo missing.
3. **API diagnostics route** — `apps/api/src/routes/adminDiagnostics.ts` reading `hasGeminiConfig(env)` for both Gemini providers, `pool.query('SELECT 1')` for DB readiness, exposing only model names + counts.
4. **Wire `ApiContext.pool`** — add `pool?: DbPool` to `ApiContext` in `apps/api/src/index.ts`, pass `pool ?? undefined` from startup, register the two routes in the dispatcher, extend `isProtectedPath` for `/api/admin` and `/api/admin/`.
5. **API tests** — `adminExport.test.ts` and `adminDiagnostics.test.ts`. Cover 401, 503, success bundle shape, per-domain error capture, content-disposition header, DB-ping happy/failure, missing key, secret-leak guard, 405 for non-GET.
6. **Web client** — `apps/web/src/api/adminApi.ts` with `fetchAdminExport`, `fetchAdminDiagnostics`, `downloadAdminExport`. Tests in `adminApi.test.ts` cover request shape, `credentials: 'include'`, and the file-name pattern of the download path (mock `URL.createObjectURL` + `document.createElement('a').click`).
7. **Settings UI** — extend `apps/web/src/sections/settings/SettingsView.tsx` with three new panels (Export, Diagnose, Deployment-Checkliste). Existing Phase 2A actions remain.
8. **Verification gate**:
   - `npm test`
   - `npm run typecheck`
   - `npm run build`
   - `npm run lint`
   - `rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist`

## Risks & decisions

- **Error tolerance.** The export must not fail because one repository throws. Decision: parallel `Promise.all` of `try/catch`-wrapped loaders; failures land in `errors[domain]` and the array becomes empty, response stays 200.
- **DB ping.** `pg.Pool#query('SELECT 1')` is the cheapest correct probe; failures (connection refused, etc.) become `'unavailable'`.
- **No restore endpoint.** Phase 3I explicitly excludes destructive restore; the Settings UI states this in German.
- **Pool on `ApiContext`.** Diagnostics needs DB access without holding a repository, so `pool` is optionally exposed on the context. Tests inject a fake `{ query, end }`.
- **Filename consistency.** The server header and client `downloadAdminExport` both derive `agorase-export-<YYYY-MM-DD>.json` from `exportedAt.slice(0, 10)`, so the saved name matches whether the browser uses `Content-Disposition` or the `<a download>` attribute.

## Out of scope (do not touch)

- New tables, schema migrations, new env vars.
- Multi-user tenancy.
- Restore / import endpoint.
- Other phases' files except the unavoidable additions to `apps/api/src/index.ts` and the Settings view.
