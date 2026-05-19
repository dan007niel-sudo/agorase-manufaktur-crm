# Next Chat Handoff: Agorase QA Follow-ups

Local repo:

```txt
/Users/daniel.lordson/Documents/Codex/2026-05-14/ich-m-chte-eine-neue-lokale/agorase-manufaktur-crm
```

Current branch: `main`

## Completed in the previous chat

- Fixed the frozen app date by replacing the hardcoded `2026-05-14` in `apps/web/src/App.tsx` with a local-date helper.
- Fixed Partners filtered detail behavior so the detail panel uses a partner from the currently visible filtered list.
- Added tests in `apps/web/src/app/appState.test.ts`.
- Added helper module `apps/web/src/app/appState.ts`.

## Remaining QA items to implement

### 1. Command Center search behavior

Current finding:

- The global topbar search is visible in Command Center, but it does not clearly filter the Command Center partner/task content.

Suggested decision:

- Either make Command Center consume filtered records/tasks consistently, or hide the topbar filters on Command Center and keep filters only for `Sourcing` and `Partners`.
- The simpler UX fix is likely hiding filters on Command Center by changing `filterSections` in `apps/web/src/App.tsx` from `['Command Center', 'Sourcing', 'Partners']` to `['Sourcing', 'Partners']`.
- If choosing filtering instead, update `CommandCenter` to receive `filteredRecords` and derive visible tasks from filtered partner IDs.

### 3. Contact modal lifecycle

Current finding:

- The "Neuer Kontakt" / edit modal remains open when navigating to another sidebar section.
- Escape did not close the modal in the gstack browser check.

Suggested implementation:

- Close `formOpen` when `activeSection` changes.
- Add Escape handling to `RecordForm` or the modal owner.
- Consider closing when clicking the modal backdrop, but avoid closing when clicking inside `.record-form`.
- Add focused tests for `RecordForm` Escape/backdrop behavior and/or `AppShell` section-change integration.

### 4. Local testability / demo mode

Current finding:

- Full local QA currently needs Postgres plus admin env values.
- Docker CLI exists on the machine, but the Docker daemon was not available during the previous check.
- A temporary scratch Mock API was used for QA; it should not be committed as product code without a deliberate design.

Suggested implementation options:

- Add a `docker-compose.yml` for local Postgres and document `.env` setup.
- Or add an explicit `npm run dev:demo` mock API/server mode that is clearly development-only.
- Prefer Docker Compose first because it tests the real API/repository path.

Useful commands:

```bash
npm run typecheck
npm run build
npm run lint
npx vitest run --exclude '.worktrees/**'
```

Note:

- Root `npm test` currently includes old `.worktrees/**` test files and can fail because of stale worktree dependencies. Use `npx vitest run --exclude '.worktrees/**'` until the test script is updated or old worktrees are removed.

## gstack notes

- `gstack` was cloned into `/Users/daniel.lordson/.codex/skills/gstack`.
- It also exists under `/Users/daniel.lordson/.claude/skills/gstack`.
- `bun` was installed at `~/.bun/bin/bun`; use `PATH="$HOME/.bun/bin:$PATH"` when invoking gstack browser commands if the shell PATH has not been updated.
