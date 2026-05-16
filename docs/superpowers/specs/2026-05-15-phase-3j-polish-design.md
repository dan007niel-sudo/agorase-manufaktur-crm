# Phase 3J — Product Polish, QA & Live Completion (Design)

Date: 2026-05-15
Status: implementing

## Goal

Phase 3J is the final polish pass for Agorase Fashion OS. No new
features; the goal is removing leftover scaffolding from earlier
phases, tightening accessibility, normalizing error code naming, and
flipping the sidebar to reflect that every section is now backed by a
persistent live workspace.

## Scope

In:

- Remove orphan code that earlier phases obsoleted but did not delete.
- Sidebar status: every shipped section reports `'active'`.
- API error-code naming: align the lone `_unconfigured` to the
  project-wide `_not_configured` convention.
- Accessibility: `aria-pressed` on toggle chip groups; remove leftover
  English `aria-label`s; window.confirm on destructive deletes.
- Empty / loading / error state audit per section.
- Update `SESSION_HANDOFF.md` to "completion ready".

Out:

- New domain models, schema changes, new external dependencies.
- CI / build-pipeline changes.
- Restore-from-export, multi-user, image proxy, design-tokens
  consolidation. (See "Possible future work" in `SESSION_HANDOFF.md`.)

## Change Log

### Removed

- `apps/web/src/sections/foundation/WorkspaceFoundation.tsx` and the
  empty `foundation/` directory. No remaining consumers.
- `ImageGenerationRequest` / `ImageGenerationResponse` from
  `packages/shared/src/ai.ts` (unused after Phase 3E shipped its own
  `MockupRequest`/`MockupResponse` in `mockups.ts`).

### Renamed

- `creative/brainstorm` 503 error code: `brainstorm_unconfigured` ->
  `brainstorm_not_configured`. Brings the route in line with the
  Phase-3E mockups route and the project lesson on the
  `_not_configured` convention.

### Sidebar

`apps/web/src/fashionOs.ts`: Production, Creative Lab, Legal
Orientation, Releases, Web Ops, and Settings switched from
`'foundation'` to `'active'`. Every section now claims live status.

### Accessibility

- `aria-pressed` added on toggle chip / category buttons in
  `MockupsView` (aspect ratio, quality), `CreativeLabView` (status
  filter), `SourcingView` (category picker).
- `WebOpsView` checklist toggle: leftover English
  `Mark X done` aria-label rewritten to German `Punkt X abhaken`,
  matching the LegalView pattern.
- `window.confirm` confirmation added on destructive delete actions in
  `MockupsView`, `CreativeLabView` (brief, saved direction, prompt
  template), and `WebOpsView`. Pattern stays the same as the LegalView
  precedent.

### Empty / Loading / Error states

Audit pass; only `ProductionView` lacked an explicit loading/empty
fallback in the workspace pane. Added German loading and empty
messages there. Other sections already covered the three states.

### Verification

Local gates expected to remain green: 45 test files / 263 tests, type
check, lint, build, secret scan empty.

Live smoke before merge confirms all 16 product routes still return
401 and `/api/health` reports both providers ready.
