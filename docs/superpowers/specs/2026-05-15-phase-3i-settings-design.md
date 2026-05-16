# Phase 3I — Settings, Export, Backup, Diagnostics (Design)

## Goal
Settings becomes the admin operations center: full read-only JSON export, provider/DB diagnostics, and a static deployment checklist. No new tables, no destructive actions, no new env vars.

## Surface

### Backend

#### `GET /api/admin/export`
Session-cookie protected. Returns an `AdminExportBundle`:

```ts
interface AdminExportBundle {
  exportedAt: string
  version: '1'
  partners: Manufactory[]
  tasks: OperationalTask[]
  partnerEvents: PartnerEvent[]
  partnerEvaluations: PartnerEvaluation[]
  productionProfiles: ProductionProfile[]
  sampleRequests: SampleRequest[]
  releases: FashionRelease[]
  releaseTasks: ReleaseTask[]
  releasePartners: ReleasePartnerLink[]
  webOpsItems: WebOpsItem[]
  creativeBriefs: CreativeBrief[]
  creativeDirections: CreativeDirection[]
  promptTemplates: PromptTemplate[]
  mockupJobs: MockupJob[]
  legalNotes: LegalNote[]
  errors?: Partial<Record<AdminExportDomain, string>>
}
```

- `Content-Disposition: attachment; filename="agorase-export-<YYYY-MM-DD>.json"`.
- 503 if any required repository is missing on `ApiContext` (DB unconfigured).
- Error tolerance: each domain `list()` is wrapped; on throw the domain becomes an empty array and the error message is captured in `errors[domain]`. Always returns 200 if every repo is present.

#### `GET /api/admin/diagnostics`
Session-cookie protected. Returns:

```ts
interface AdminDiagnostics {
  checkedAt: string
  providers: {
    geminiText: 'ready' | 'not_configured'
    geminiImage: 'ready' | 'not_configured'
    database: 'ready' | 'unavailable'
  }
  env: {
    geminiTextModel: string
    geminiImageModel: string
    allowedOriginsCount: number
  }
  deployment: { nodeEnv: string }
}
```

- Provider readiness mirrors `hasGeminiConfig(env)` — single Gemini key controls both.
- DB readiness uses a `SELECT 1` on the `pg.Pool`; thrown errors map to `'unavailable'`.
- No secret values in the response: model names, counts, and statuses only.

### Shared
- New module `packages/shared/src/admin.ts` exporting `AdminExportBundle`, `AdminDiagnostics`, `AdminExportDomain`, `AdminExportErrors`. Re-exported from `packages/shared/src/index.ts`.

### API context
- `ApiContext.pool?: DbPool` added so the diagnostics route can ping the DB without holding a repository handle.
- `index.ts` startup wiring passes `pool` alongside the repos.

### Web client (`apps/web/src/api/adminApi.ts`)
- `fetchAdminExport()` — typed GET, `credentials: 'include'`.
- `fetchAdminDiagnostics()` — typed GET, `credentials: 'include'`.
- `downloadAdminExport()` — fetches the bundle, builds a `Blob`, triggers an `<a download>` click, revokes the object URL. Pure client-side download.

### Settings UI
Four panels, all in German:
1. Existing Phase 2A panel (status text, Seed speichern, Logout) — untouched.
2. Export panel — single button "Vollständigen Export herunterladen" plus success/error state.
3. Diagnose panel — loaded on mount via `fetchAdminDiagnostics`, renders a `<dl>` grid: Gemini Text, Gemini Image, Datenbank, Modell-Namen, Allowed-Origins-Zahl, Deployment-Stage. German label mapping for status values (`ready`, `nicht konfiguriert`, `nicht erreichbar`).
4. Deployment-Checkliste — static list: Env-Variablen-Namen, Render-Services, Restore-Hinweis (kein destruktiver Restore).

## Constraints
- No new env vars, no new tables.
- No secret values in any response.
- All admin routes session-cookie protected via `isProtectedPath` covering `/api/admin` and `/api/admin/`.
- Export is read-only; no import endpoint exists.

## Tests
- `apps/api/src/routes/adminExport.test.ts` — 401, 503 missing repo, full bundle shape with `Content-Disposition`, per-domain error capture, 405 non-GET.
- `apps/api/src/routes/adminDiagnostics.test.ts` — 401, ready/not_configured paths, DB-ping happy and failure, no secret leak grep, 405 non-GET.
- `apps/web/src/api/adminApi.test.ts` — request shape with `credentials: 'include'` for both endpoints; download path mocks `URL.createObjectURL`, `document.createElement('a').click()`, asserts `agorase-export-<YYYY-MM-DD>.json` filename pattern.
