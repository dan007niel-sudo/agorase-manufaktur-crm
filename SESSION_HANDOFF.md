# Session Handoff

Last updated: 2026-05-17

## Purpose

Use this file when starting a new Codex chat so work can continue without reconstructing the whole project history.

Suggested opener for a new chat:

```txt
Weiter am lokalen Repo:
/Users/daniel.lordson/Documents/Codex/2026-05-14/ich-m-chte-eine-neue-lokale/agorase-manufaktur-crm

Bitte lies SESSION_HANDOFF.md und mache beim nächsten geplanten Schritt weiter.
```

## Product Goal

Agorase Fashion OS is a small CRM/operating system for sourcing, evaluating, contacting, and managing fashion manufactory/partner relationships.

Current product direction:

- Phase 1: Foundation, deployed web + API, secure Gemini proxy.
- Phase 2A: Persistent partner data via Render Postgres.
- Phase 2B: Admin login with secure session cookie.
- Phase 3: Complete all Fashion OS sections into persistent, useful, admin-only workflows.

## Current Live URLs

- Web: https://agorase-fashion-os-web.onrender.com
- API health: https://agorase-fashion-os-api.onrender.com/api/health
- API partners: https://agorase-fashion-os-api.onrender.com/api/partners
- GitHub: https://github.com/dan007niel-sudo/agorase-manufaktur-crm

GitHub repo visibility: private.

## Current Git State

As of the last update:

- Branch: `main`
- Remote: `origin`
- Local `main` was clean and in sync with `origin/main`
- Latest pushed app commit:
  - `32e3420 feat: allow partner delete and stop seeding empty databases`
- Phase 3 was declared completion-ready in `fbb5fcc`. Four follow-up
  Phase-4 enhancements have shipped on top of it.

Recent important commits (newest first):

- `32e3420 feat: allow partner delete and stop seeding empty databases` (Phase 4D)
- `12a9ff4 feat: add DACH legal templates for DE/AT/CH` (Phase 4C)
- `9cdbd77 fix: add visible feedback to chip and card interactions` (Phase 4B)
- `3f3ec27 feat: support reference uploads and downloads in mockups` (Phase 4A)
- `fbb5fcc docs: mark completion readiness` (Phase 3J)
- `4722be5 feat: add admin data tools` (Phase 3I)
- `438f74f feat: build legal orientation workspace` (Phase 3F)
- `979dbc4 feat: build mockup generation workspace` (Phase 3E)
- `d6b03a8 feat: build creative lab` (Phase 3D)
- `0cb8a98 feat: build web ops workspace` (Phase 3H)
- `26e9712 feat: build release planning workspace` (Phase 3G)
- `d4f5382 feat: build production workspace` (Phase 3C)
- `6373e14 feat: add persistent operational records` (Phase 3B)
- `d73dd8d refactor: split web app shell and sections` (Phase 3A)

## Current Product State

Phase 1 is live:

- React/Vite web app on Render Static Site.
- Node API service on Render.
- Gemini API proxy is server-side only.
- Gemini is configured and `/api/health` reported `gemini: ready`.

Phase 2A is live:

- Render Postgres is connected.
- `GET /api/partners` returned `200`.
- Smoke-test record `phase-2-smoke` was deleted.
- Six seed partner records were imported into the live database.
- Web route `/partners` returned `200`.
- Partner data is now persistent across browser sessions and deploys.

Phase 2B is live:

- Admin login uses a server-issued `HttpOnly` session cookie.
- `ADMIN_PASSWORD` and `SESSION_SECRET` are set on the Render API service.
- Product API routes are protected.
- Live unauthenticated `GET /api/partners` returns `401`.
- Live invalid login returns `401 Authentication failed`, confirming auth env is active.
- `GET /api/auth/session` returns `{"authenticated":false}` when not logged in.

Phase 3 is fully live. Every sidebar section is backed by a persistent
admin workspace served by an auth-protected API:

- Phase 3A App Architecture is LIVE: `App.tsx` is split into App Shell, Auth Gate, sections, API clients, and shared UI components.
- Phase 3B Operational Data is LIVE: persistent operational tasks, partner events, and partner evaluations.
- Phase 3C Production Workspace is LIVE: production profiles, sample requests, readiness, and Command Center production blockers.
- Phase 3D Creative Lab is LIVE: creative briefs, brainstormed and saved directions, prompt templates, and the Gemini-backed `/api/creative/brainstorm` route.
- Phase 3E Mockups is LIVE: persistent mockup jobs with server-routed image generation via `/api/mockups`, brief and release linkage, history detail, and delete confirmation.
- Phase 3F Legal Orientation is LIVE: persistent legal notes, risk levels, jurisdictions, checklists, source links, and disclaimer copy clarifying it is not legal advice.
- Phase 3G Releases is LIVE: persistent releases, release tasks, linked partners, content readiness, and Command Center launch tasks.
- Phase 3H Web Ops is LIVE: persistent web ops items (page briefs, copy, SEO, publishing checklist) linked to releases.
- Phase 3I Settings/export/diagnostics is LIVE: read-only JSON export at `/api/admin/export` and provider/env diagnostics at `/api/admin/diagnostics`.
- Phase 3J Polish is DONE: orphan code removed, sidebar status flipped to active across the board, brainstorm error code renamed to `_not_configured`, aria-pressed added to chip toggles, English aria-labels rewritten to German, destructive deletes confirmed.

All previously planned placeholder areas are DONE.

Phase 4 enhancements (shipped on top of the completion baseline) are live:

- Phase 4A Mockup References & Download is LIVE: up to 3 reference images per job (PNG/JPEG/WebP, max 2 MB each) persisted as `reference_images jsonb` on `mockup_jobs`; `POST /api/mockups/generate` builds a multimodal Gemini request with the references; new `GET /api/mockups/:id/download` proxies the result image with a safe `Content-Disposition` filename. Fixed a latent bug in the Node HTTP adapter where `outgoing.end(await response.text())` corrupted binary bodies; now uses `Buffer.from(await response.arrayBuffer())`.
- Phase 4B Button Feedback Polish is LIVE: `.chip.selected` rule (was missing entirely), `.chip:hover` / `.chip:active` / `.chip:focus-visible`, and consistent hover/active/focus styling for all selectable cards (web-ops, releases, creative lab, legal). Pure CSS, no logic changes.
- Phase 4C DACH Legal Templates is LIVE: 18 curated legal templates (6 × DE / 6 × AT / 6 × CH) covering Impressum, Datenschutz, AGB, Widerruf/Rücktritt/Rücknahme, Verpackungsregister, Markenregistrierung. Hardcoded in `packages/shared/src/legalTemplates.ts` (no DB table). LegalView has a new "Aus Vorlage anlegen" picker with country chip filter, jurisdiction `<datalist>` (DE/AT/CH/EU), and a visible "Templates sind Startpunkte, keine Rechtsberatung" disclaimer.
- Phase 4D Partner Delete & Fresh-Start UX is LIVE: `deletePartner` web client added (DELETE endpoint already existed server-side), red "Partner löschen" button with `window.confirm` in PartnersView, empty-state message when no records exist, and the seed auto-fallback in App.tsx was removed so an empty database stays empty. The "Seed neu importieren" button in Settings remains as opt-in.

## Important Files

Project docs:

- `SESSION_HANDOFF.md`: this file.
- `README.md`: general setup and deployment notes.
- `docs/deployment/render-readiness.md`: Render checklist.
- `docs/superpowers/specs/2026-05-15-agorase-fashion-os-completion-design.md`
- `docs/superpowers/plans/2026-05-15-agorase-fashion-os-completion-master-plan.md`
- `docs/superpowers/specs/2026-05-14-phase-2a-persistent-partners-design.md`
- `docs/superpowers/plans/2026-05-14-phase-2a-persistent-partners.md`
- `docs/superpowers/specs/2026-05-14-phase-2b-admin-login-design.md`
- `docs/superpowers/plans/2026-05-14-phase-2b-admin-login.md`

Phase 2A implementation:

- `render.yaml`: Render web/API/Postgres blueprint.
- `.env.example`: local env template.
- `packages/shared/src/crm.ts`: shared CRM types.
- `apps/api/src/db/client.ts`: Postgres pool.
- `apps/api/src/db/migrate.ts`: startup migration runner.
- `apps/api/src/db/schema.sql`: partners table schema.
- `apps/api/src/db/partnersRepository.ts`: partner DB operations.
- `apps/api/src/routes/partners.ts`: partner API routes.
- `apps/api/src/index.ts`: API routing and startup wiring.
- `apps/web/src/partnersApi.ts`: frontend partner API client.
- `apps/web/src/App.tsx`: app state, API sync, Settings seed action.

Phase 2B implementation files:

- `packages/shared/src/api.ts`
- `.env.example`
- `render.yaml`
- `apps/api/src/env.ts`
- `apps/api/src/http.ts`
- `apps/api/src/auth/session.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/index.ts`
- `apps/api/src/server.test.ts`
- `apps/web/src/authApi.ts`
- `apps/web/src/authApi.test.ts`
- `apps/web/src/partnersApi.ts`
- `apps/web/src/aiResearch.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.css`
- `README.md`
- `docs/deployment/render-readiness.md`

Current Phase 3 target areas:

- `apps/web/src/App.tsx`: now handles high-level app state and section routing after Phase 3A split.
- `apps/web/src/fashionOs.ts`: sidebar module definitions.
- `apps/api/src/routes/mockups.ts`: placeholder image-generation route.
- `apps/api/src/routes/visualize.ts`: placeholder creative route.
- `packages/shared/src/ai.ts`: existing AI request/response contracts.
- `packages/shared/src/fashion.ts`: current broader Fashion OS types.
- `packages/shared/src/releases.ts`: Phase 3G release planning contracts.
- `apps/api/src/routes/releases.ts`: protected Phase 3G release API.
- `apps/web/src/sections/releases/ReleasesView.tsx`: Phase 3G release planning UI.

## What Went Wrong / Lessons Learned

Render setup:

- The app was not initially online; a private GitHub repo had to be created and connected to Render.
- Render services had to be created through Blueprint setup.
- `ALLOWED_ORIGINS` and `VITE_API_BASE_URL` were initially confusing because the Render service URLs do not exist until the services are created.

CORS / routing:

- Render returned `404` for `OPTIONS /api/research/partners` while `OPTIONS /api/research/partners/` worked.
- Fix shipped in `0cb2fb2 fix: support render research preflight`.
- Frontend now calls `/api/research/partners/`, and API normalizes trailing slashes.

Phase 2A database:

- After pushing Phase 2A, the new `/api/partners` route deployed before Render Postgres was synced.
- Live API temporarily returned:
  - `503 database_unavailable`
- Manual Render Blueprint sync / DB creation fixed it.

Migration build path:

- `schema.sql` is not copied by `tsc` into `dist`.
- Fix shipped in `1598023 fix: load migrations from built api`.
- `apps/api/src/db/migrate.ts` falls back from built `dist` path to source `src/db/schema.sql`.

Smoke data:

- A live smoke-test partner `phase-2-smoke` was inserted to verify DB persistence.
- It was later deleted and replaced with the six real seed records.

Tooling hiccup:

- A one-off `npx tsx -e` seed-import attempt failed because top-level await was not supported with that eval output format.
- Retried successfully inside an async function.

Phase 2B start:

- A Phase 2B implementation worktree had not yet been created.
- The user asked for this handoff before more implementation work started.

Phase 2B deployment:

- After merge/push, Render briefly served the old API version.
- Polling showed the API switched to the new version when unauthenticated `/api/partners` changed from `200` to `401`.
- Before Render picked up `ADMIN_PASSWORD` and `SESSION_SECRET`, login returned `503 auth_not_configured`.
- After the user set API env vars and Render restarted, invalid login returned `401 Authentication failed`.
- This confirmed both auth env values were active without exposing the real admin password.

Phase 3 planning and implementation:

- Phase 3A, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, and 3J were implemented in isolated worktrees, merged to `main`, pushed, and live-smoked.
- Continue using one child spec and one child implementation plan per phase.
- Remaining placeholder sections should be implemented as focused persistent workspaces, not by adding large feature blocks back into `App.tsx`.

Phase 3H–3J lessons:

- **Shared-type name collisions are silent.** When a new module added a type whose name already existed elsewhere in `packages/shared/src/`, the barrel `index.ts` re-export silently picked one. Before introducing a new shared type, grep `packages/shared/src/index.ts` for the name and resolve any collision explicitly.
- **Project secret-scan regex matches env-var NAMES too.** The deploy gate greps for `GEMINI_API_KEY`, `GOOGLE_API_KEY`, etc. as substrings. Documenting the required secrets in the Settings UI with the literal identifiers caused the gate to fail. Fix: in user-facing copy, use German descriptive labels (`Gemini-API-Schlüssel`, `Datenbank-URL`, `Admin-Passwort`, `Session-Geheimnis`, `Erlaubte Origins`).
- **Persist before calling external providers.** The Phase 3E image route was the highest-risk provider integration so far (latency, cost, partial failure). Persisting the job row before calling Gemini and updating the row in place when the response arrives keeps the admin workspace consistent even if the provider call fails or times out. Worth keeping as the default pattern for any future provider integration.

Phase 3G deployment:

- After merge/push, Render briefly served the old API version and `/api/releases` returned `404`.
- Polling showed the API switched to the new version when unauthenticated `/api/releases` changed to `401 Authentication required`.
- Live health still reported `ok: true`, Gemini ready, image ready.
- Live web root returned `200`.

## Existing Worktrees

At one point these old worktrees existed:

- `.worktrees/fashion-os-api`
- `.worktrees/fashion-os-deploy`
- `.worktrees/fashion-os-monorepo`
- `.worktrees/fashion-os-ui`

The Phase 2A, Phase 2B, Phase 3A, Phase 3B, Phase 3C, and Phase 3G worktrees were removed after their branches were merged/pushed.

Before starting new work, run:

```bash
git status --short --branch
git worktree list
```

For the next implementation phase, create a fresh worktree such as:

```bash
git worktree add .worktrees/phase-3h-web-ops -b codex/phase-3h-web-ops
```

## Verification Already Passed

For Phase 2A before deployment:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Results:

- `npm test`: 8 test files, 46 tests passed.
- Typecheck passed.
- Build passed.
- Lint passed.
- Web bundle secret scan had no output.

Live Phase 2A smoke checks:

- `GET /api/health`: `ok: true`, Gemini ready.
- `GET /api/partners`: `200`, partner data returned.
- `POST /api/partners/import`: `200`.
- `/partners` web route: `200`.

For Phase 2B before deployment:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Results:

- `npm test`: 37 test files, 187 tests passed on merged `main`.
- Typecheck passed.
- Build passed.
- Lint passed.
- Web bundle secret scan had no output.

Live Phase 2B smoke checks:

- `GET /api/health`: `200`.
- Unauthenticated `GET /api/partners`: `401 unauthorized`.
- `GET /api/auth/session`: `{"authenticated":false}` when not logged in.
- Invalid `POST /api/auth/login`: `401 Authentication failed` after Render env was active.
- Web app loads at `https://agorase-fashion-os-web.onrender.com`.

For Phase 3G on merged `main`:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Results:

- `npm test`: 67 test files, 323 tests passed on merged `main`.
- Typecheck passed.
- Build passed.
- Lint passed.
- Web bundle secret scan had no output.
- Browser smoke via Playwright fallback passed for Releases navigation, release editor, launch task creation, and partner linking.

Live Phase 3G smoke checks:

- `GET /api/health`: `{"ok":true,"providers":{"gemini":"ready","image":"ready"}}`
- Unauthenticated `GET /api/releases`: `401 unauthorized`.
- Web root returned `200`.

## Next Planned Work

### Completion ready

Agorase Fashion OS is feature-complete for the originally scoped
private admin operating system. After Phase 3J ships:

- Every sidebar section is persistent and live (Command Center,
  Sourcing, Partners, Production, Creative Lab, Mockups, Legal
  Orientation, Releases, Web Ops, Settings).
- All product API routes are auth-protected behind the admin session
  cookie. `GET /api/health`, `GET /api/auth/session`,
  `POST /api/auth/login`, `POST /api/auth/logout`, and CORS preflight
  are the only public exceptions.
- All AI provider secrets stay server-side. The web bundle contains
  zero references to `GEMINI_API_KEY`, `GOOGLE_API_KEY`,
  `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`, `x-goog-api-key`,
  or `AIza`-prefixed tokens.
- Read-only JSON export endpoint exists at `/api/admin/export`.
- Diagnostics endpoint exists at `/api/admin/diagnostics` and reports
  Gemini text/image readiness, database reachability, model identifiers,
  allowed-origin count, and `NODE_ENV`.
- Provider error codes follow a consistent `<feature>_not_configured`
  / `<feature>_failed` naming pattern.

The app is ready for daily admin use. There is no pending Phase-3 work.

### Open manual step (Phase 4D follow-up)

The six original seed partner records imported during Phase 2A
(`Atelier Stoffwerk Berlin`, `Confezione Lago` etc.) are still in the
live Render Postgres. To start with a clean CRM:

1. Log in at https://agorase-fashion-os-web.onrender.com
2. Sidebar → Partners
3. For each seed entry: select the row → click the red **"Partner
   löschen"** button in the detail panel → confirm.
4. After the last one, the empty-state message replaces the table.

The "Seed neu importieren"-Button in Settings can re-seed at any time
if the user wants the demo data back. Phase 4D removed the automatic
seed-fallback in `App.tsx`, so empty databases now stay empty.

### Possible next-phase ideas (post-4D)

If more work follows, candidates raised during the Phase-4 sessions:

- Additional DACH legal templates (Textilkennzeichnungsverordnung,
  Lieferkettengesetz LkSG, Influencer Marketing UWG, Designschutz)
- Delete affordances in the other sections (Releases, Web Ops cards do
  not yet have a delete button, only the explicit detail-view delete in
  Mockups, Creative Lab, Legal, Partners).
- Reference image reordering / drag-and-drop in Mockups.
- Per-reference rejection feedback when Gemini fails a single image.
- Image proxy / DAM for larger mockup outputs and reference assets.

### Possible future work

Smart future-direction ideas if the project ever grows beyond a single
admin operator. None of these are required for completion.

- **Multi-user**: turn the single `ADMIN_PASSWORD` cookie into per-user
  accounts with role-based ACLs.
- **Restore-from-export**: the `/api/admin/export` endpoint is read-only
  by design; a destructive restore endpoint with explicit confirmation
  semantics is the natural next step.
- **Image proxy / DAM**: today the mockups workspace stores small
  inline payloads. A real digital asset pipeline (signed URLs, CDN,
  image variants) would reduce DB row weight and enable larger assets.
- **Design tokens consolidation**: the project's de-facto color tokens
  `#fffdf8` / `#f4efe4` are still inline hex values. Promoting them
  into a tokens module would simplify future theming.
- **Env-var documentation regex refinement**: the deploy secret-scan
  regex matches plain env-var NAMES too, which is why the Settings UI
  uses German labels (`Gemini-API-Schlüssel`, etc.) instead of literal
  identifiers. A targeted regex could allow documenting names without
  flagging the scan.

### Final Live Smoke Checklist

Run this sequence after the final deploy to confirm completion:

```bash
curl -sS https://agorase-fashion-os-api.onrender.com/api/health
for path in partners tasks partner-events partner-evaluations \
  production/profiles production/samples releases web-ops \
  creative/briefs creative/directions creative/prompt-templates \
  creative/brainstorm mockups legal/notes admin/export admin/diagnostics; do
  echo "$path: $(curl -sS -o /dev/null -w '%{http_code}' https://agorase-fashion-os-api.onrender.com/api/$path)"
done
curl -sS -o /dev/null -w 'web: %{http_code}\n' https://agorase-fashion-os-web.onrender.com/
```

Expected:

- `/api/health`: `{"ok":true,"providers":{"gemini":"ready","image":"ready"}}`
- Every other route: `401` (auth required, route is registered).
- Web root: `200`.

## Important Security Notes

Do not put these in frontend/Vite env:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Phase 2B should use:

- `HttpOnly` session cookie
- `Secure` cookie in production
- `SameSite=None` in production because API and web are on different Render origins
- `credentials: 'include'` in browser API calls
- exact `ALLOWED_ORIGINS`, never wildcard

## Quick Current Commands

Check local state:

```bash
git status --short --branch
git log -3 --oneline --decorate
```

Check live API:

```bash
curl -sS https://agorase-fashion-os-api.onrender.com/api/health
curl -sS https://agorase-fashion-os-api.onrender.com/api/partners
```

Check live web:

```bash
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://agorase-fashion-os-web.onrender.com/partners
```
