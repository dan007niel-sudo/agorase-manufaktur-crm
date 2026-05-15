# Phase 3E — Mockups Design

## Goal

Replace the placeholder `/api/mockups/generate` endpoint with a real, persisted, server-routed image-generation workflow. The workspace must let an admin describe a mockup in German, generate it via Gemini, and review the history of generated jobs without leaking provider secrets.

## Scope

- Persist every generation attempt (pending, completed, failed) in `mockup_jobs`.
- Generate via the existing `gemini-3-pro-image-preview` model (env-configurable through `GEMINI_IMAGE_MODEL`).
- Store either the upstream-returned URL (`fileData.fileUri`) or a small inline base64 payload (`inlineData.data`). Anything above 4 MB is dropped from inline storage; if no URL was returned, the job is marked failed.
- Admin-only history view with status pills, prompt preview, and detail view.
- Command Center surfaces failed jobs (last 7 days) and stuck pending jobs (older than 5 minutes).

Out of scope: full DAM, signed URLs, asset storage in object stores, multi-image variants per job, regeneration with the same id.

## Data model

`mockup_jobs` (idempotent `CREATE TABLE IF NOT EXISTS`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | caller-provided slug |
| `prompt` | text not null | required |
| `reference_notes` | text not null default '' | optional context |
| `aspect_ratio` | text not null default '1:1' | one of `'1:1' | '4:5' | '16:9' | '9:16' | '3:4'` |
| `quality` | text not null default 'standard' | one of `'draft' | 'standard' | 'hi'` |
| `status` | text not null | one of `'pending' | 'completed' | 'failed'` |
| `model_used` | text not null default '' | provider model id at call time |
| `image_url` | text not null default '' | preferred storage |
| `image_data` | text not null default '' | base64 fallback, ≤ 4 MB |
| `mime_type` | text not null default '' | e.g. `image/png` |
| `error` | text not null default '' | sanitized failure message |
| `release_id` | text not null default '' | optional link |
| `brief_id` | text not null default '' | optional link |
| `notes` | text not null default '' | internal notes |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | |

Indexes on `status`, `brief_id`, `release_id`.

## Shared contracts (`packages/shared/src/mockups.ts`)

- Unions: `MockupAspectRatio`, `MockupQuality`, `MockupJobStatus`.
- Runtime const arrays: `MOCKUP_ASPECT_RATIOS`, `MOCKUP_QUALITIES`, `MOCKUP_JOB_STATUSES`.
- `MockupJob` interface (camelCase fields matching the table columns).
- `MockupJobInput` (id + prompt required, everything else optional).
- `GenerateMockupRequest` and `GenerateMockupResponse`.
- `MockupJobsResponse` / `MockupJobResponse`.

## API endpoints

All behind the existing session-cookie guard.

- `GET /api/mockups?status=&brief=&release=` — list jobs (newest first).
- `GET /api/mockups/:id` — fetch a single job; 404 when missing.
- `DELETE /api/mockups/:id` — delete and return 204.
- `POST /api/mockups/generate` — the real provider call.

`POST /api/mockups/generate` flow:

1. Validate body, require `prompt`.
2. Return `503 mockups_not_configured` if `GEMINI_API_KEY` is unset.
3. Persist a `pending` row with the generated id BEFORE calling the provider.
4. Call `https://generativelanguage.googleapis.com/v1beta/models/<image-model>:generateContent` with header `x-goog-api-key`. Body sends the prompt + reference notes plus a `generationConfig.imageConfig.aspectRatio`.
5. Read the first inline image and the first file URI from `candidates[0].content.parts`.
6. If both are absent, mark the job `failed` with a generic message.
7. If inline base64 exceeds 4 MB and no URL is available, mark `failed`. If a URL is available, drop the inline payload and keep the URL.
8. Update the row to `completed` with `image_url`, `image_data`, `mime_type`.
9. Always return `GenerateMockupResponse` (200) with the final job, including the failed variant — the client surfaces the error via the job row, not via an HTTP error.

### Sanitization

- Never echo `GEMINI_API_KEY`, `x-goog-api-key`, the upstream URL, or upstream response bodies.
- Failure messages are constants from this file (`'Image provider is temporarily unavailable.'`, `'Image provider returned no image data.'`, `'Image payload exceeded the 4 MB inline limit.'`).
- The mocked-fetch route tests grep the response JSON for `AIza`, `x-goog-api-key`, `googleapis.com`, and the test secret.

## Web client (`apps/web/src/api/mockupsApi.ts`)

- `listMockupJobs`, `getMockupJob`, `deleteMockupJob`, `generateMockup`.
- All requests `credentials: 'include'`, identical `requestJson` helper as `creativeApi`.

## UI (`apps/web/src/sections/mockups/MockupsView.tsx`)

Three-column layout reusing `creative-lab-layout` styling:

- **Left:** generate panel (prompt textarea, reference notes textarea, aspect-ratio chips, quality chips, optional brief select, optional release select, internal notes, "Mockup generieren" primary button).
- **Center:** chronological history (newest first) with status pill, prompt preview, ratio + quality.
- **Right:** detail card with image (or fallback message), prompt, metadata, "Löschen" button.

All strings German.

## Command Center derivation (`apps/web/src/sections/mockups/mockupTasks.ts`)

- Failed jobs from the last 7 days: `mockup-failed-${jobId}` → "Mockup fehlgeschlagen: <prompt-snippet>".
- Pending jobs older than 5 minutes: `mockup-pending-${jobId}` → "Mockup-Job hängt: <prompt-snippet>".

Wired into the App.tsx Command Center pipeline alongside production, release, web ops, and creative tasks.

## Tests

- `apps/api/src/db/mockupJobsRepository.test.ts` — mapping, validation, list filters, get, upsert, delete.
- `apps/api/src/routes/mockups.test.ts` — 401 for every verb, list filters, get/delete, validation, 503 not-configured, success with inline base64, success with file URI, 500 → failed + sanitized, no-image-no-URL → failed, oversized base64 with URL fallback, oversized base64 without URL → failed.
- `apps/web/src/api/mockupsApi.test.ts` — request shape, credentials, error path, generate response.
- `apps/web/src/sections/mockups/mockupTasks.test.ts` — failed/pending derivation with persisted-tasks merging and snippet truncation.

## Security

- API key only ever read from `env.geminiApiKey` and only sent as the `x-goog-api-key` header.
- Web bundle is verified clean of `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `x-goog-api-key`, and `AIza` before shipping.
- All routes in the protected-path list.
