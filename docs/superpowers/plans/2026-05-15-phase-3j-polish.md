# Phase 3J — Product Polish, QA & Live Completion (Plan)

Date: 2026-05-15
Branch: `codex/phase-3j-polish`

## Objective

Final polish pass. Make the app feel complete and ready for daily admin
use. No new features.

## Steps

1. Read `CLAUDE.md`, the master completion plan, and SESSION_HANDOFF.
2. Baseline: `npm test`, `npm run typecheck`, `npm run build`,
   `npm run lint`. (45 files / 263 tests pass.)
3. Live smoke against current production:
   - `GET /api/health` returns providers ready.
   - Every other listed route returns 401.
   - Web root returns 200.
4. Orphan cleanup:
   - Delete `apps/web/src/sections/foundation/WorkspaceFoundation.tsx`
     and the empty `foundation/` directory after grep confirms zero
     remaining consumers.
   - Trim unused `ImageGeneration*` types from
     `packages/shared/src/ai.ts`.
5. Sidebar status: flip every shipped section in `fashionOs.ts` to
   `'active'`. Update `fashionOs.test.ts` to assert the new state.
6. API error code naming: rename `brainstorm_unconfigured` ->
   `brainstorm_not_configured` in `apps/api/src/routes/creative.ts`.
7. Accessibility:
   - Audit chip/category toggle groups, add `aria-pressed`.
   - Replace any leftover English `aria-label` inside German section
     code.
   - Add `window.confirm` to destructive delete actions in MockupsView,
     CreativeLabView (brief / saved direction / prompt template),
     WebOpsView.
8. Empty / loading / error state audit per section. Only fix the gaps
   (do not redesign).
9. Re-run gates. Run secret scan on `apps/web/dist`.
10. Capture bundle size with `du -sh apps/web/dist`.
11. Update `SESSION_HANDOFF.md` to "completion ready".
12. Hand off to deployer.

## Verification gate

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist
```

All green; secret scan empty.

## Out of scope

Restore-from-export, multi-user, image proxy, design tokens
consolidation, env-var documentation regex refinement, CI changes,
schema changes.
