# Phase 4A — Mockup References & Download Plan

## Sequencing (TDD)

1. Shared contracts
   - Extend `packages/shared/src/mockups.ts` with `MockupReference`,
     `MockupReferenceKind`, `MOCKUP_REFERENCE_KINDS`, `MOCKUP_MAX_REFERENCES`,
     `MOCKUP_MAX_REFERENCE_BYTES`, `MOCKUP_ALLOWED_REFERENCE_MIME_TYPES`.
   - Add `referenceImages` to `MockupJob` and `reference_images` to
     `GenerateMockupRequest`.
2. Schema
   - Add `reference_images jsonb not null default '[]'::jsonb` to
     `mockup_jobs` (plus an idempotent `alter table ... add column if not
     exists`).
3. Repository
   - Add `mapMockupReferencesValue` (mirror `parseChecklist`).
   - Add `validateReferenceImages` to `normalizeMockupJobInput` (max 3,
     allowed mime, allowed kind, ≤ 2 MB, required fields).
   - Extend `mapMockupJobRow` / `upsertMockupJob` (serialize via
     `JSON.stringify`).
   - Add tests for round-trip, defensive parsing, all validation paths.
4. Route — generate
   - Extend `POST /api/mockups/generate` to read `reference_images`.
   - Run `normalizeMockupJobInput` before the first DB write to bounce bad
     requests with 400 without persisting.
   - Build the Gemini parts array as `[...inlineData, { text }]`.
   - Raise the per-request body cap to 8 MB via a new optional `maxBytes` on
     `readJson` (other routes keep the global 100 kB cap).
   - Tests: multimodal body shape, 4-references → 400, bad mime → 400, no
     secret leak with references in play.
5. Route — download
   - Add a regex match for `/^\/api\/mockups\/([^/]+)\/download$/` in the
     mockups dispatcher.
   - Resolve body from `imageData` (decode base64) → else `imageUrl`
     (server-side fetch + proxy bytes) → else 404.
   - Build the filename via a sanitizer that strips anything outside
     `[A-Za-z0-9._-]`.
   - Tests: 401, 404 unknown, 404 not completed, 200 inline, 200 URL-proxy,
     filename sanitization.
6. Web client
   - Add `downloadMockupJob` and `parseContentDispositionFilename` to
     `mockupsApi.ts`.
   - Send `reference_images` through `generateMockup`.
   - Tests (jsdom): credentials, anchor click, filename parsing, error path.
7. UI
   - Add upload zone, kind picker, remove button, in-card thumbnail strip,
     download buttons to `MockupsView.tsx`.
   - Add matching CSS rules in `App.css` for every new className.
8. Verify
   - `npm test` (expect ~286 tests, up from 263).
   - `npm run typecheck`.
   - `npm run build`.
   - `npm run lint`.
   - `rg ... apps/web/dist` (must be empty).
   - `rg 'GEMINI_API_KEY|process\.env\.GEMINI' apps/web/src` (must be empty).

## Risk register

- **`readJson` body cap.** Default 100 kB cap would reject any reference
  upload. Mitigation: per-route override (`MAX_GENERATE_BODY_BYTES = 8 MB`)
  scoped only to the generate handler.
- **Cross-origin downloads.** Browser `download` attribute on a cross-origin
  URL is honoured only when CORS / Content-Disposition cooperate. Mitigation:
  always proxy through `/api/mockups/:id/download` so the response shares the
  web origin and includes the right header.
- **Filename injection.** Job ids are caller-provided slugs. Mitigation:
  `.replace(/[^A-Za-z0-9._-]/g, '_')` before embedding in
  `Content-Disposition`.
- **Multimodal misorder.** Gemini docs recommend reference images before the
  text part. We enforce this in `callGeminiForImage` and assert it in a route
  test.

## Out of scope

- Persisting references in object storage.
- Bulk download of an entire job's references.
- Drag-and-drop ordering / preview cropping.
- Regenerate-with-same-id flows.

## Deploy

Standard phase deploy per project CLAUDE.md (handled by the deployer agent):
commit on `codex/phase-4a-mockup-references`, fast-forward merge to `main`,
push, poll for the new download route returning 401 unauthenticated, smoke
health + existing routes.
