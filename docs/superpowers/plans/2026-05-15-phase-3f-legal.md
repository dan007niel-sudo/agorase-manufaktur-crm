# Phase 3F — Legal Orientation Implementation Plan

## Order of work (TDD)

1. **Shared contracts** — `packages/shared/src/legal.ts` with `LegalRiskLevel`, `LegalNoteStatus`, `LEGAL_RISK_LEVELS`, `LEGAL_NOTE_STATUSES`, `LegalChecklistItem`, `LegalNote`, `LegalNoteInput`, response envelopes. Re-export from `packages/shared/src/index.ts`. **Remove dead `LegalNote` placeholder from `packages/shared/src/fashion.ts`** to resolve export collision.
2. **Schema** — Add `legal_notes` table to `apps/api/src/db/schema.sql` with 3 indexes (risk_level, status, jurisdiction).
3. **Repository** — `apps/api/src/db/legalNotesRepository.ts` exporting `mapLegalNoteRow`, `normalizeLegalNoteInput`, `listLegalNotes`, `getLegalNote`, `upsertLegalNote`, `deleteLegalNote`, `createPostgresLegalNotesRepository`. Write `.test.ts` first covering mapping, validation, list filters, defensive checklist parsing.
4. **Route** — `apps/api/src/routes/legal.ts` exporting `legalRoute` + `LegalNotesRepository` interface. PATCH does fetch-merge-upsert.
5. **Route tests** — `apps/api/src/routes/legal.test.ts`: 401 unauth on every verb, CRUD happy paths, validation 400, PATCH merge, list filters.
6. **Wire into `apps/api/src/index.ts`** — import, add to `ApiContext`, dispatch branch, `isProtectedPath` entries (`/api/legal`, `/api/legal/`), construct repo in startup context.
7. **Web client** — `apps/web/src/api/legalApi.ts` with all CRUD + filters. Test: request shape, credentials, encoded ids.
8. **Tasks derivation** — `apps/web/src/sections/legal/legalTasks.ts` + `.test.ts`. Four branches: critical / overdue / soon / counsel-stale.
9. **UI** — `apps/web/src/sections/legal/LegalView.tsx`. Non-advice disclaimer at top. German strings. Editor + checklist + filters.
10. **App.tsx wiring** — import view + tasks derivation + API client + `LegalNote` type. Add `legalNotes` state. Load in Promise.all. Concat tasks. Replace `WorkspaceFoundation` for `'Legal Orientation'`.
11. **CSS** — Append `.legal-*` rules to `apps/web/src/App.css` mirroring `.web-ops-*` layout + new `.legal-disclaimer` block.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist
```

Expected: all gates green, secret scan empty. Test count rises by ~5 files / ~30 tests over Phase 3E baseline (38/220 → ~43/250).

## Files touched

Created:
- `packages/shared/src/legal.ts`
- `apps/api/src/db/legalNotesRepository.ts` + `.test.ts`
- `apps/api/src/routes/legal.ts` + `.test.ts`
- `apps/web/src/api/legalApi.ts` + `.test.ts`
- `apps/web/src/sections/legal/LegalView.tsx`
- `apps/web/src/sections/legal/legalTasks.ts` + `.test.ts`
- `docs/superpowers/specs/2026-05-15-phase-3f-legal-design.md`
- `docs/superpowers/plans/2026-05-15-phase-3f-legal.md`

Modified:
- `packages/shared/src/fashion.ts` (remove dead `LegalNote`)
- `packages/shared/src/index.ts` (re-export legal)
- `apps/api/src/db/schema.sql` (new table + indexes)
- `apps/api/src/index.ts` (route wiring + isProtectedPath + context)
- `apps/web/src/App.tsx` (state + load + tasks + section render)
- `apps/web/src/App.css` (legal-* rules)
