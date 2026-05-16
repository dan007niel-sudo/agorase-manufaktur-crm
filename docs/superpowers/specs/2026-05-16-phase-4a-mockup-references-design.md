# Phase 4A — Mockup References & Download Design

## Goal

Extend the existing Phase 3E mockups workflow with two enhancements:

1. Multimodal generation: send up to 3 reference images (PNG/JPEG/WebP, ≤ 2 MB each)
   alongside the prompt so Gemini can ground the output on real visual cues.
2. First-class download: every completed mockup is downloadable via an
   authenticated `GET /api/mockups/:id/download` endpoint that streams either
   inline base64 or proxied URL bytes with an `attachment` Content-Disposition.

No new env vars. No new providers. No DAM. References stay inline in `mockup_jobs`
to preserve the simple, one-file-per-domain pattern.

## Data model

`mockup_jobs` gets one new column:

| Column | Type | Notes |
| --- | --- | --- |
| `reference_images` | `jsonb not null default '[]'::jsonb` | Array of `MockupReference` |

Schema is idempotent (`alter table ... add column if not exists`) so existing
production rows keep working.

`MockupReference`:
```ts
{ id: string; name: string; data: string; mimeType: string; kind: 'style' | 'sketch' | 'reference' }
```

Constraints enforced in `normalizeMockupJobInput`:
- `Array.isArray` and `length ≤ 3`
- `id` / `name` / `data` all non-empty
- `mimeType ∈ { image/png, image/jpeg, image/webp }`
- `kind ∈ { style, sketch, reference }`
- `Buffer.byteLength(data, 'utf8') ≤ 2 MB`

Row mapping uses a new `mapMockupReferencesValue` helper that mirrors the
defensive `parseChecklist` pattern from `webOpsItemsRepository` (handles array,
JSON string, null, malformed → `[]`).

## Routes

### `POST /api/mockups/generate`

- New optional `reference_images` field in the request body.
- Route calls `normalizeMockupJobInput` BEFORE the first DB upsert. A bad
  reference (oversized, bad mime, bad kind, >3) returns `400` and no `mockup_jobs`
  row is written.
- The generate body cap is raised from the global 100 kB to 8 MB via a new
  optional `maxBytes` parameter on `readJson`. Other routes keep the global cap.
- The Gemini request body is now multimodal:
  ```
  contents: [{ role: 'user', parts: [
    ...references.map(ref => ({ inlineData: { mimeType, data } })),
    { text: promptText }
  ] }]
  ```
  References come first, prompt last. The text part is unchanged from Phase 3E.
- All existing sanitization rules (no key leak, no upstream URL leak, no header
  leak, 4 MB result-image cap) stay intact.

### `GET /api/mockups/:id/download` (new, session-protected)

- Returns the result image only (references are inputs, not deliverables).
- `404 mockup_not_found` if id unknown.
- `404 mockup_image_unavailable` if status != `completed` or no payload exists.
- Headers:
  - `Content-Type: <job.mimeType || image/png>`
  - `Content-Disposition: attachment; filename="agorase-mockup-<safeId>-<YYYY-MM-DD>.<ext>"`
  - `safeId = id.replace(/[^A-Za-z0-9._-]/g, '_')`
  - `ext` is `png | jpeg | webp` from mime
- Body resolution order:
  1. `imageData` (base64) → decoded with `Buffer.from(..., 'base64')`
  2. Else `imageUrl` → server-side `fetch`, body proxied (so the browser's
     `<a download>` attribute works across origins, and so auth covers it)
  3. Else → 404 `mockup_image_unavailable`
- Wired into the existing mockups dispatcher with a regex match on
  `/^\/api\/mockups\/([^/]+)\/download$/`. The id segment is decoded and
  sanitized when building the filename, so no path-traversal characters can
  leak into the header.
- `isProtectedPath` already covers `/api/mockups/*` — no dispatcher change
  needed for auth.

## Web

### `apps/web/src/api/mockupsApi.ts`

- `generateMockup(request)` now passes through `reference_images`.
- New `downloadMockupJob(id)`:
  - `fetch('/api/mockups/<id>/download', { credentials: 'include' })`
  - reads response as Blob
  - parses `Content-Disposition` to recover the server filename (with a
    `agorase-mockup-<id>.png` fallback)
  - creates an object URL, clicks a hidden `<a download>`, revokes the URL

### `apps/web/src/sections/mockups/MockupsView.tsx`

- Upload zone with 3 slots:
  - Each filled slot: thumbnail, filename, kind picker (`Style` / `Skizze` / `Referenz`), `Entfernen` button.
  - Empty slot: a labelled `<input type="file" accept="image/png,image/jpeg,image/webp">` (visually hidden, accessibility name "Referenzbild hinzufügen") wrapped in a clickable card.
- Client-side validation before upload:
  - mime ∈ allowed → otherwise "Nur PNG, JPEG oder WebP."
  - size ≤ 2 MB → otherwise "Maximal 2 MB pro Datei."
  - count < 3 → otherwise the empty slot is hidden.
- `FileReader.readAsDataURL` produces the base64; the leading `data:<mime>;base64,` prefix is stripped before the value is stored in component state.
- Job list cards show up to 3 × 24 px reference thumbnails next to the prompt
  snippet, plus a per-card "Download" button when `status === 'completed'`.
- Detail panel shows a horizontal reference strip with kind labels below each
  thumbnail and a prominent "Download" primary button when a result is
  available.

### CSS

Added in `App.css` (each className in the JSX has a matching rule, as required
by the Phase 3J polish guardrail):

`.mockup-references`, `.mockup-reference-grid`, `.mockup-reference-slot`,
`.mockup-reference-slot.empty`, `.mockup-reference-thumb`,
`.mockup-reference-meta`, `.mockup-reference-name`, `.mockup-reference-kind`,
`.mockup-reference-remove`, `.mockup-reference-strip`,
`.mockup-reference-strip-thumb`, `.mockup-reference-detail`,
`.mockup-reference-detail-row`, `.mockup-reference-detail-item`,
`.mockup-reference-detail-thumb`, `.mockup-detail-actions`,
`.mockup-download-button`, `.creative-lab-card-body`.

## Out of scope

- Persisted reference uploads to object storage (still inline base64).
- Multi-image variants per job.
- Drag-and-drop reorder of references.
- Bulk download.
- Signed URLs.

## Lessons-Learned candidates

- Vitest's default environment is `node`. Web tests that touch `document`,
  `URL.createObjectURL`, etc. need `// @vitest-environment jsdom` at the top
  of the file (matches existing `AppShell.test.tsx` / `adminApi.test.ts`).
- `readJson`'s default 100 kB cap is tight for any AI route that accepts
  inline images. Pass a per-route `maxBytes` rather than raising the global.
