# Phase 3D — Creative Lab Design

## Goal

Turn Creative Lab from a `WorkspaceFoundation` placeholder into a persistent,
Gemini-backed brainstorming workspace. The operator should be able to write
fashion briefs, generate AI-driven creative directions through a secure server
proxy, save the strongest directions, and manage a small library of reusable
prompt templates.

## Data Model

Three new tables in `apps/api/src/db/schema.sql`, all with `id text primary key`
and no foreign keys (per project convention).

### `creative_briefs`

Captures a structured brief: goal, audience, tone, reference notes, season, and
an optional `release_id` to attach the brief to a Phase 3G release. Status is
a closed union:

- `draft` — work in progress, not yet ready to brainstorm
- `exploring` — actively running brainstorms
- `directions-saved` — at least one AI direction has been saved
- `approved` — a direction has been picked and approved
- `archived` — kept for history

### `creative_directions`

A concept (AI or manual) attached to one brief. Fields capture title, summary,
body, comma-separated keywords/palette/materials/silhouettes, the prompt and
model used (for AI provenance), `source` (`ai` | `manual`), and `saved` (true
once the operator commits the direction). The brainstorm endpoint never
persists directly; only an explicit `POST /api/creative/directions` writes.

### `prompt_templates`

Reusable prompt fragments — name, description, category, body — that operators
can layer in front of their brainstorming prompt.

Indexes:

- `creative_directions.brief_id`
- `creative_briefs.status`
- `creative_briefs.release_id`

## API Contract

All routes are mounted at `/api/creative/*` and gated by the existing
session-cookie guard. The protected-path matcher in `apps/api/src/index.ts`
adds `'/api/creative'` and `'/api/creative/'`.

CRUD shape mirrors `apps/api/src/routes/webOps.ts`:

- `GET    /api/creative/briefs` (optional `?status=`, `?release=`)
- `POST   /api/creative/briefs`
- `GET    /api/creative/briefs/:id`
- `PUT    /api/creative/briefs/:id`
- `DELETE /api/creative/briefs/:id`
- `GET    /api/creative/directions` (optional `?brief=`)
- `POST   /api/creative/directions`
- `PUT    /api/creative/directions/:id`
- `DELETE /api/creative/directions/:id`
- `GET    /api/creative/prompt-templates`
- `POST   /api/creative/prompt-templates`
- `PUT    /api/creative/prompt-templates/:id`
- `DELETE /api/creative/prompt-templates/:id`
- `POST   /api/creative/brainstorm` — Gemini-backed

### Brainstorm Flow

Request body:

```ts
{
  brief_id?: string
  prompt: string
  template_id?: string
  count?: number // clamped 1..6, default 3
}
```

Server prompt assembly:

1. If `template_id` resolves to an existing prompt template, prepend its `body`
   followed by two newlines.
2. Append the user `prompt`.
3. Append a JSON-shape directive asking for `count` distinct concepts with
   `{title, summary, body, keywords, palette, materials, silhouettes}`.

The server then calls `gemini-2.5-pro` (the same `geminiTextModel` used by
`routes/research.ts`) using the existing pattern — `x-goog-api-key` header,
never in the URL.

Output handling:

- Strip surrounding ```json fences if present, then `JSON.parse`.
- If parsing succeeds and yields an array, normalize each entry into a
  `CreativeDirection` with `source: 'ai'`, `saved: false`, fresh ids, and the
  prompt/model used.
- If parsing fails, return a single fallback direction:
  `{ title: 'Roher Modelloutput', body: <raw text>, source: 'ai', saved: false }`.
- If the model returns no text, return `directions: []`.

Error / leak boundary:

- Missing prompt → `400 invalid_brainstorm_request`.
- Missing `GEMINI_API_KEY` → `503 brainstorm_unconfigured` (no key string in
  body).
- Provider non-2xx or network throw → `502 brainstorm_failed`. No upstream URL,
  status, response body, or `x-goog-api-key` value appears in the response.
- Brainstorm response is **not persisted**; the client decides what to save via
  `POST /api/creative/directions`.

## UI

`apps/web/src/sections/creativeLab/CreativeLabView.tsx` replaces the
`WorkspaceFoundation` slot for `Creative Lab` in `App.tsx`. Layout:

- Left column: brief list, status filter chips, "Neuer Brief" button.
- Center column: brief editor (all fields), plus a "Brainstorming" sub-panel
  (prompt textarea, optional template dropdown, count 1–6, "Vorschläge
  generieren" button). Below the editor sits a small prompt template CRUD
  panel.
- Right column: directions list for the selected brief — AI suggestions
  (unsaved) show "Speichern" / "Verwerfen"; saved directions show "Bearbeiten"
  and "Löschen".

All user-facing strings are German. Styling reuses `panel`, `panel-header`,
`empty-state`, `error-box`, `form-grid two`, `web-ops-card`, etc. New
class names get the `creative-lab-…` prefix and small CSS additions to
`App.css`.

## Command Center

`apps/web/src/sections/creativeLab/creativeTasks.ts` emits `CrmTask` entries
the Command Center already merges:

- `creative-brainstorm-<briefId>` for briefs in status `exploring` with zero
  saved directions.
- `creative-approve-<briefId>` for briefs in status `directions-saved`.
- `creative-release-<briefId>` for briefs in status `approved` whose linked
  release launches within 14 days (urgency hint via title prefix
  "Release-kritisch:").

IDs are prefixed `creative-…` to avoid collision with existing web-ops/release
task ids.

## Testing Strategy

- Shared: rely on type contracts; no runtime tests needed beyond what the repos
  cover.
- API repositories: list, get, upsert, delete, filtered list, validation
  errors. One repo test file per table.
- API routes: 401 unauthenticated on brief/direction/template CRUD; happy-path
  CRUD via fake repositories; brainstorm success (mock `fetch`), provider 500
  (assert `502 brainstorm_failed` + no leak), malformed text fallback, empty
  output, missing-prompt 400.
- Web API client: request shape, `credentials: 'include'`, error propagation,
  brainstorm response shape.
- Web tasks: covers all three task kinds in one focused test.

The verification gate adds the same secret-grep over `apps/web/dist` and a
source scan to make sure `GEMINI_API_KEY` never reaches the web bundle.

## Out of Scope

- Actual image generation (Phase 3E).
- Persisting brainstorm results server-side.
- Approval workflow beyond status transitions on the brief.
- Mood-board / multi-asset attachments.
- Cross-brief search.

## Deviation Notes

- The existing `BrainstormRequest` / `BrainstormResponse` types in
  `packages/shared/src/ai.ts` were placeholders never wired into product code;
  Phase 3D introduces fresh, brief-aware versions in
  `packages/shared/src/creative.ts` and removes the unused ones.
- `apps/api/src/routes/visualize.ts` is removed; the placeholder route
  `/api/visualize` is replaced by the real `/api/creative/brainstorm` route.
