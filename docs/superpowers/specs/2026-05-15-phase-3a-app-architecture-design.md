# Phase 3A App Architecture Design

## Goal

Phase 3A splits the current large web `App.tsx` into focused app shell, auth gate, section, API client, and reusable UI component modules without changing the visible product behavior.

The phase is complete when the current Command Center, Sourcing, Partners, Production foundation, placeholder foundations, Settings, login flow, partner API sync, seed import, modal editing, filters, task completion, and logout behavior still work, but the code is ready for the remaining Phase 3 feature work.

## Current State

- `apps/web/src/App.tsx` is 1024 lines and mixes auth, data loading, navigation, section rendering, forms, tables, AI research UI, settings actions, and reusable panel controls.
- `apps/web/src/authApi.ts` and `apps/web/src/partnersApi.ts` are root-level clients while the Phase 3 architecture calls for `apps/web/src/api/`.
- `App.css` contains the existing styling and class names that should remain stable in this phase.
- Existing web tests cover API client credentials, CRM utilities, AI research parsing, and Fashion OS module definitions.
- Phase 3B and later will add multiple persistent domains, so Phase 3A should reduce coupling before new workflows are added.

## Non-Goals

- Do not add new product data models, routes, migrations, or persistence.
- Do not redesign the UI or rewrite CSS.
- Do not change sidebar module names, statuses, labels, or ordering.
- Do not change request paths, request payloads, credential behavior, or auth cookie handling.
- Do not remove local-storage task completion yet; Phase 3B will replace it with persisted operational tasks.
- Do not alter Render deployment settings.

## Target Architecture

### App Shell

Create `apps/web/src/app/AppShell.tsx` for the authenticated frame:

- sidebar branding and navigation
- topbar title, summary, filters, and "Neuer Kontakt" action
- shared error alert slot
- main children slot for the active section

The shell owns layout markup only. It receives active section, active module, metrics, filters, and callbacks as props.

### Auth Gate And Auth State

Create `apps/web/src/app/authState.ts` for:

- `AuthStatus`
- `RecordsStatus`
- `storageKeys`
- `useAdminAuth`
- `useLocalState`
- reset-query local-storage cleanup helper

Create `apps/web/src/app/AuthGate.tsx` for:

- login screen rendering when unauthenticated, checking, or auth-error
- child rendering when authenticated

The web app still stores no auth token. The login form still delegates to the existing auth API client.

### API Clients

Move web API clients under `apps/web/src/api/`:

- `apps/web/src/api/authApi.ts`
- `apps/web/src/api/partnersApi.ts`

Tests should import the new paths and confirm:

- auth requests use `credentials: 'include'`
- login sends the same JSON password payload
- partner requests use `credentials: 'include'`
- update paths continue URL-encoding partner ids
- failed responses still throw readable errors

### Shared UI Components

Create reusable components:

- `apps/web/src/components/Panel.tsx`: panel header and metric tile components.
- `apps/web/src/components/PartnerTable.tsx`: compact partner table used by Command Center, Partners, and Bulk Import preview.
- `apps/web/src/components/FormControls.tsx`: generic field control and partner record modal form.

Keep existing CSS class names so visual behavior remains stable.

### Sections

Extract section modules:

- `apps/web/src/sections/command/CommandCenter.tsx`
- `apps/web/src/sections/sourcing/SourcingView.tsx`
- `apps/web/src/sections/partners/PartnersView.tsx`
- `apps/web/src/sections/production/ProductionView.tsx`
- `apps/web/src/sections/foundation/WorkspaceFoundation.tsx`
- `apps/web/src/sections/settings/SettingsView.tsx`

Each section receives data and callbacks through props. Sections should not load app-wide records directly and should not know about auth state.

## Behavioral Compatibility Checklist

- Unauthenticated app load shows the login panel.
- Auth session check still runs once on app load.
- Successful login switches to the authenticated app shell.
- Failed login shows `Login fehlgeschlagen.`.
- Authenticated app load fetches partners from `/api/partners`.
- Partner load failure falls back to seed data and shows the existing sync alert.
- Filters by query, category, and status still affect partner/production records.
- "Neuer Kontakt" still opens the modal with an empty record.
- Saving a record still calls the partner API, upserts locally, selects the saved id, and closes the modal.
- Inline partner status/follow-up/next-step edits still call update API.
- Bulk import and AI import still import records, reset filters, and navigate to Partners.
- Seed speichern still imports seed data.
- Logout still calls the auth API and returns to login.
- `reset=1` still clears the existing local-storage keys before local state is initialized.

## Testing Strategy

Use TDD for the refactor:

1. Add failing tests that expect API clients at their new `apps/web/src/api/` locations and verify behavior.
2. Add a failing App Shell rendering test that expects sidebar/topbar layout and callbacks from `app/AppShell`.
3. Move API client production code to satisfy the new tests.
4. Extract app shell and section/components while keeping current behavior.
5. Run focused web tests after each extraction group.
6. Run full verification before commit:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

## Completion Criteria

- `apps/web/src/App.tsx` is reduced to orchestration: auth, records state, filters, derived data, and active-section routing.
- Extracted modules compile with TypeScript and follow existing React/Vite patterns.
- No product behavior or API contract changes are introduced.
- Legacy root-level web API client files are removed after imports/tests are updated.
- Full verification passes.
- Work is committed as `refactor: split web app shell and sections`.
