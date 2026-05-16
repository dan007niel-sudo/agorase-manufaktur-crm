# Phase 3F — Legal Orientation Design

## Goal

Provide an admin-only operational checklist tool for tracking legal/regulatory tasks (Impressum, DSGVO, Markenrecht, etc.) with risk flags, jurisdictions, source links, and review status. **Explicitly not legal advice** — the UI must make this clear.

## Persistent records

One new table: `legal_notes` (see schema.sql). Per project convention: text id, no FK on `release_id` / `partner_id`, jsonb `checklist`, text for all date fields, only `created_at` / `updated_at` are `timestamptz`.

Fields:
- Identity: `id`, `title`, `topic`, `jurisdiction`
- Classification: `risk_level` ∈ {`low`, `medium`, `high`, `critical`}, `status` ∈ {`open`, `in-review`, `awaiting-counsel`, `resolved`, `monitoring`}
- Content: `summary`, `body`, `checklist` (jsonb of `{id, label, done}`), `source_links` (newline-separated URLs), `notes`
- Action: `next_action`, `next_action_due`, `responsible`
- Links: `release_id`, `partner_id` (optional)
- Timestamps: `created_at`, `updated_at`

Indexes: `risk_level`, `status`, `jurisdiction`.

## API contract

All routes behind session-cookie auth, mirroring Web Ops/Creative Lab pattern.

- `GET /api/legal/notes` — list, filters `?status=`, `?risk=`, `?jurisdiction=`, `?release=`, `?partner=`
- `POST /api/legal/notes` — create
- `GET /api/legal/notes/:id` — get one (404 if missing)
- `PUT /api/legal/notes/:id` — full upsert
- `PATCH /api/legal/notes/:id` — merge with existing
- `DELETE /api/legal/notes/:id`

Validation in `normalizeLegalNoteInput`: required `id` + `title`, `risk_level` ∈ `LEGAL_RISK_LEVELS`, `status` ∈ `LEGAL_NOTE_STATUSES`, defensive checklist parsing (parsed array, JSON string, null, malformed → []).

## UI workflow

`LegalView` is a two-column layout (list + workspace):

1. **Top of list panel**: prominent German non-advice disclaimer: "Diese Sektion ist eine operative Organisation für rechtliche Aufgaben. Sie ersetzt keine Rechtsberatung. Verbindliche Auskünfte nur durch qualifizierte Anwält:innen einholen."
2. **Filters**: risk, status, jurisdiction (jurisdiction list derived from existing notes).
3. **List**: cards showing title, risk · status, jurisdiction.
4. **Workspace**: summary chips (risk, status, open checklist items) + editor (title, topic, jurisdiction, risk/status selects, release link, responsible, summary, body, next-action + due date, source-links textarea, notes) + checklist editor (add/toggle/edit-label/remove).
5. **Delete** is confirmed via `window.confirm` (destructive action protection — fixes a Phase 3E nit).

## Command Center derivation

`createLegalCommandTasks` derives `CrmTask` entries:
- **Critical-risk + status ∈ {open, in-review, awaiting-counsel}** → `legal-critical-${id}`, urgency `'today'`
- **Past due date + status ≠ resolved** → `legal-overdue-${id}`, urgency `'overdue'`
- **Due within 7 days + status ≠ resolved** → `legal-soon-${id}`
- **Status = awaiting-counsel + updated_at older than 14 days** → `legal-counsel-${id}`

All prefixed to avoid collision with `web-ops-*`, `creative-*`, `release-task-*`, `mockup-*`, `*-production-blocker`.

## Testing strategy

- `apps/api/src/db/legalNotesRepository.test.ts`: row mapping, validation (riskLevel/status unions, missing title/id), filter serialization, checklist parsing (object, string, null, malformed).
- `apps/api/src/routes/legal.test.ts`: 401 unauthenticated, CRUD happy paths, PATCH merge, validation 400, list filters.
- `apps/web/src/api/legalApi.test.ts`: request shape, `credentials: 'include'`, encoded ids, filter serialization.
- `apps/web/src/sections/legal/legalTasks.test.ts`: critical-risk flag, overdue, soon-due, counsel-stale, resolved skip, persisted completion.

## Security

- All routes session-cookie protected. `/api/legal` and `/api/legal/` added to `isProtectedPath`.
- No new env vars.
- No provider integration.

## Convention deviations from brief

- The pre-existing dead `LegalNote` placeholder in `packages/shared/src/fashion.ts` was removed (it had a different incompatible shape and was unused) to avoid an `index.ts` export collision. The new full-featured `LegalNote` in `packages/shared/src/legal.ts` is the canonical type.
- Delete uses `window.confirm` (mockups nit) — first destructive-action confirm in the codebase. May be extracted to a shared helper in a future polish phase.

## Out of scope

- Document attachments (URLs only)
- Workflow approvals / e-signing
- Counsel mailbox integration
- Versioning / audit log of changes
- Multi-user permissions
