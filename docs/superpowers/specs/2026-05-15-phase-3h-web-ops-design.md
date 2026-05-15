# Phase 3H Web Ops Design

## Goal

Track website copy, SEO notes, publishing tasks, and deployment readiness as persistent admin-only records. Each record can stand alone or be linked to a release from Phase 3G.

## Scope

- Single domain table `web_ops_items` covering page briefs, copy briefs, SEO notes, publishing tasks, and deployment checks.
- Optional link to a release via `release_id` (no DB-level foreign key, matching the rest of the project's loose-coupling pattern).
- Per-item checklist of `{id, label, done}` entries stored as JSON.
- Section UI for list, filters, editor, SEO panel, and checklist.
- Command Center derivations surface `blocked` items and `deployment-check` items as launch tasks.

Out of scope:

- Multi-user workflows.
- Storing rendered HTML, attachments, or CMS exports.
- Public preview, publishing API integrations, sitemap generation.
- Migration of the old `WorkspaceFoundation` placeholder for other sections.

## Data Model

New table `web_ops_items`:

| Column            | Type                              | Notes                                                                  |
|-------------------|-----------------------------------|------------------------------------------------------------------------|
| `id`              | text primary key                  | client-generated, deterministic-friendly                               |
| `release_id`      | text not null default ''          | empty string = no release link                                         |
| `title`           | text not null                     | required                                                               |
| `kind`            | text not null                     | one of `page-brief|copy-brief|seo-note|publishing-task|deployment-check` |
| `status`          | text not null                     | one of `idea|in-progress|review|ready|shipped|blocked`                 |
| `summary`         | text not null default ''          |                                                                        |
| `body`            | text not null default ''          | longer brief content                                                   |
| `target_url`      | text not null default ''          | optional URL or route                                                  |
| `seo_title`       | text not null default ''          |                                                                        |
| `seo_description` | text not null default ''          |                                                                        |
| `seo_keywords`    | text not null default ''          | comma-separated                                                        |
| `checklist`       | jsonb not null default '[]'::jsonb | array of `{id,label,done}`                                             |
| `assignee`        | text not null default ''          |                                                                        |
| `due_date`        | text not null default ''          | ISO date string, follows project convention                            |
| `notes`           | text not null default ''          |                                                                        |
| `created_at`      | timestamptz not null default now()|                                                                        |
| `updated_at`      | timestamptz not null default now()|                                                                        |

Indexes: `web_ops_items_release_id_idx`, `web_ops_items_status_idx`, `web_ops_items_kind_idx`.

### Convention deviations from the brief

- `release_id` is `text not null default ''` without a foreign key. The rest of the project uses the same loose pattern (`release_tasks.release_id`, `partner_events.partner_id`, etc.) — no DB-level FK constraints, so adding one here would be inconsistent.
- `due_date` is `text` rather than `date`. Every other date field in this schema (`release.launch_date`, `release_tasks.due_date`, `sample_requests.target_date`, …) is `text`, and the shared `WebOpsItem.dueDate` is `string`. Storing as `date` would force a type translation that no other table does.

These deviations are intentional and consistent. If we later harden the schema, we should migrate the whole repo at once.

## Shared Contracts

`packages/shared/src/webOps.ts` exposes:

- `WebOpsKind`, `WebOpsStatus` union types.
- `WEB_OPS_KINDS`, `WEB_OPS_STATUSES` runtime arrays for validation and UI rendering.
- `WebOpsChecklistItem` interface.
- `WebOpsItem` interface (all fields).
- `WebOpsItemInput` (omit `id`/timestamps from required, omit `releaseId` from required).
- `WebOpsItemsResponse`, `WebOpsItemResponse` response envelopes.

Re-exported from `packages/shared/src/index.ts`.

## API Contract

All routes are behind the existing session-cookie guard. Trailing slashes are normalized like the rest of the routes.

| Method | Path                  | Body / Query                            | Response                |
|--------|-----------------------|-----------------------------------------|-------------------------|
| GET    | `/api/web-ops`        | `?release=<id>&kind=<kind>&status=<s>`  | `{ items: WebOpsItem[] }` |
| POST   | `/api/web-ops`        | `WebOpsItem`                            | `{ item: WebOpsItem }`  |
| GET    | `/api/web-ops/:id`    | —                                       | `{ item: WebOpsItem }` (404 if missing) |
| PUT    | `/api/web-ops/:id`    | `WebOpsItem` (id from path wins)        | `{ item: WebOpsItem }`  |
| PATCH  | `/api/web-ops/:id`    | partial `WebOpsItem`                    | `{ item: WebOpsItem }` — server fetches existing, merges, upserts |
| DELETE | `/api/web-ops/:id`    | —                                       | `204`                   |

Validation errors return `400 invalid_web_ops_item`. Repository-less environments return `503 database_unavailable`. Unauthenticated requests return `401 unauthorized`.

## UI Workflow

Web Ops section is wired into `AppShell` via `App.tsx`. Layout mirrors the Releases section:

- Left panel: filters (kind, status, release), new item button, item list cards.
- Right panel: status summary, item editor (title, kind, status, release link, due date, owner, target URL, summary, body, notes), SEO editor (title, description, keywords), checklist editor with toggle/add/remove.
- Empty/loading/error states match the Releases visual language.

Command Center: `createWebOpsCommandTasks` emits `CrmTask` entries for items with `status === 'blocked'` (titled `Web Ops Blocker: …`) or `kind === 'deployment-check'` (titled `Web Ops: …`), skipping shipped items. Completion is mirrored via the existing operational task persistence.

## Testing Strategy

TDD per task:

1. Repository unit tests for row mapping, checklist parsing (JSON string/null/garbage), input validation, list ordering, list filters, upsert SQL shape, delete shape.
2. Server integration tests against `handleRequest` covering auth gate, filter passthrough, create, get, PUT, PATCH-merge, DELETE.
3. Web client tests for credentials, encoded ids, filter query construction, all five method shapes.
4. Command Center derivation test covers urgency mapping, blocker-vs-deployment titling, persisted-completion mirroring, and the `shipped` exclusion.

No React render test for `WebOpsView` (Releases has none — staying consistent).

## Verification Gate

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Expected: all green, secret scan empty.

## Security Notes

- API key set, admin secrets, database URL stay in API env — Web Ops introduces no new env vars.
- Web client uses `credentials: 'include'` on every request.
- Web Ops route is added to the protected-path allow list in `apps/api/src/index.ts`.
