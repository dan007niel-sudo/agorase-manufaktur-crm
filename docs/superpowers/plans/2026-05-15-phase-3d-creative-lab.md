# Phase 3D — Creative Lab Implementation Plan

## Order of work

1. **Shared contracts** — `packages/shared/src/creative.ts`, re-export from
   `index.ts`. Remove the unused stale `BrainstormRequest`/`BrainstormResponse`
   from `ai.ts`.
2. **Schema** — add `creative_briefs`, `creative_directions`,
   `prompt_templates` + indexes to `apps/api/src/db/schema.sql`.
3. **Repositories** (TDD per table):
   - `apps/api/src/db/creativeBriefsRepository.ts` + `.test.ts`
   - `apps/api/src/db/creativeDirectionsRepository.ts` + `.test.ts`
   - `apps/api/src/db/promptTemplatesRepository.ts` + `.test.ts`
4. **Routes** — `apps/api/src/routes/creative.ts` with all CRUD + brainstorm.
   Wire into `apps/api/src/index.ts` (ApiContext, dispatch, `isProtectedPath`).
   Remove `routes/visualize.ts` and its dispatch entry.
5. **Server tests** — extend `apps/api/src/server.test.ts` with auth + happy
   path; create a focused `apps/api/src/routes/creative.test.ts` for the
   brainstorm-specific scenarios (mock fetch, leak grep, fallback, empty).
6. **Web API client** — `apps/web/src/api/creativeApi.ts` + `.test.ts`.
7. **Tasks derivation** —
   `apps/web/src/sections/creativeLab/creativeTasks.ts` + `.test.ts`.
8. **Section UI** —
   `apps/web/src/sections/creativeLab/CreativeLabView.tsx` + minimal CSS.
9. **App wiring** — replace the `'Creative Lab'` `WorkspaceFoundation` block in
   `apps/web/src/App.tsx`, load creative data alongside other section data,
   merge `creativeTasks` into the Command Center task pipeline.
10. **Verification gate** — `npm test && npm run typecheck && npm run build &&
    npm run lint` + both secret-scan greps.

## Notes

- Mirror the `webOpsItemsRepository` mapping/normalize/upsert pattern exactly.
- Mirror the `webOpsRoute` dispatch shape, but split into three resource paths
  under `/api/creative/*`.
- The brainstorm provider call lives in a small helper inside `routes/creative.ts`
  to keep `providers/gemini.ts` focused on partner research. No upstream URL or
  headers are surfaced in any response body.
- Brainstorm results are returned to the client but never written server-side.
- `count` is clamped to `[1, 6]` with default `3`.
- IDs for AI-suggested directions are generated on the server as
  `dir-<random>` so the client can immediately render and selectively save.
