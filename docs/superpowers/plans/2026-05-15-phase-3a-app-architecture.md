# Phase 3A App Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the large web app into maintainable app shell, auth gate, API client, section, and reusable component modules without changing behavior.

**Architecture:** Keep `App.tsx` as the stateful orchestrator while moving authenticated layout into `app/AppShell.tsx`, login gating and auth helpers into `app/`, API clients into `api/`, reusable UI into `components/`, and current sidebar views into `sections/`. Preserve CSS class names and request contracts so the refactor is behavior-neutral.

**Tech Stack:** TypeScript, React 19, Vite, Fetch API, Vitest, Testing Library, jsdom.

---

## File Structure

- Create `apps/web/src/api/authApi.ts`: moved auth API client.
- Create `apps/web/src/api/partnersApi.ts`: moved partner API client.
- Remove `apps/web/src/authApi.ts`: legacy root auth client after imports are updated.
- Remove `apps/web/src/partnersApi.ts`: legacy root partner client after imports are updated.
- Modify `apps/web/src/authApi.test.ts`: import the moved auth client and add payload/error regression coverage.
- Modify `apps/web/src/partnersApi.test.ts`: import the moved partner client and add URL-encoding regression coverage.
- Create `apps/web/src/app/authState.ts`: auth status types, record status type, storage keys, admin auth hook, reset helper, local-storage hook.
- Create `apps/web/src/app/AuthGate.tsx`: login view and authenticated child gate.
- Create `apps/web/src/app/AppShell.tsx`: sidebar, topbar, alert slot, and authenticated layout.
- Create `apps/web/src/app/AppShell.test.tsx`: shell rendering and callback tests.
- Create `apps/web/src/components/Panel.tsx`: `PanelHeader` and `Metric`.
- Create `apps/web/src/components/PartnerTable.tsx`: compact partner table.
- Create `apps/web/src/components/FormControls.tsx`: `Field` and `RecordForm`.
- Create `apps/web/src/sections/command/CommandCenter.tsx`: current dashboard and task list.
- Create `apps/web/src/sections/sourcing/SourcingView.tsx`: current AI research and bulk import views.
- Create `apps/web/src/sections/partners/PartnersView.tsx`: current list/detail partner view.
- Create `apps/web/src/sections/production/ProductionView.tsx`: current pipeline board plus foundation panel.
- Create `apps/web/src/sections/foundation/WorkspaceFoundation.tsx`: current placeholder foundation panel.
- Create `apps/web/src/sections/settings/SettingsView.tsx`: current settings actions.
- Modify `apps/web/src/App.tsx`: reduce to orchestration and active-section routing.
- Keep `apps/web/src/App.css` unchanged unless type or markup extraction exposes confirmed dead styles.

## Task 1: API Client Location Regression Tests

**Files:**
- Modify: `apps/web/src/authApi.test.ts`
- Modify: `apps/web/src/partnersApi.test.ts`
- Create later: `apps/web/src/api/authApi.ts`
- Create later: `apps/web/src/api/partnersApi.ts`

- [ ] **Step 1: Write failing auth API import and behavior tests**

Update `apps/web/src/authApi.test.ts` to import from `./api/authApi` and include:

```ts
it('sends the login password as JSON', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ authenticated: true }), { status: 200 }))

  await login('pw')

  expect(fetch).toHaveBeenCalledWith(
    '/api/auth/login',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ password: 'pw' }),
    }),
  )
})

it('throws readable auth errors for failed responses', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad password', { status: 401 }))

  await expect(login('wrong')).rejects.toThrow('bad password')
})
```

- [ ] **Step 2: Write failing partner API import and URL tests**

Update `apps/web/src/partnersApi.test.ts` to import from `./api/partnersApi` and include:

```ts
it('encodes partner ids when updating one partner', async () => {
  const partner = createEmptyManufacture('Atelier Forma')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partner }), { status: 200 }))

  await updatePartner('atelier/forma berlin', { nextStep: 'Call' })

  expect(fetch).toHaveBeenCalledWith(
    '/api/partners/atelier%2Fforma%20berlin',
    expect.objectContaining({ method: 'PUT', credentials: 'include', body: JSON.stringify({ nextStep: 'Call' }) }),
  )
})
```

- [ ] **Step 3: Run tests to verify RED**

Run:

```bash
npx vitest run apps/web/src/authApi.test.ts apps/web/src/partnersApi.test.ts
```

Expected: fail because `apps/web/src/api/authApi.ts` and `apps/web/src/api/partnersApi.ts` do not exist yet.

- [ ] **Step 4: Move API clients**

Create `apps/web/src/api/authApi.ts` with the current auth client implementation. Create `apps/web/src/api/partnersApi.ts` with the current partner client implementation. Update `apps/web/src/App.tsx` imports to use `./api/authApi` and `./api/partnersApi`. Remove the old root client files.

- [ ] **Step 5: Run tests to verify GREEN**

Run:

```bash
npx vitest run apps/web/src/authApi.test.ts apps/web/src/partnersApi.test.ts
```

Expected: pass.

## Task 2: App Shell Test And Extraction

**Files:**
- Create: `apps/web/src/app/AppShell.test.tsx`
- Create: `apps/web/src/app/AppShell.tsx`
- Modify later: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing App Shell test**

Create `apps/web/src/app/AppShell.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fashionOsModules } from '../fashionOs'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders navigation, topbar filters, alert, and children', () => {
    const onSelect = vi.fn()
    const onQueryChange = vi.fn()
    const onCategoryChange = vi.fn()
    const onStatusChange = vi.fn()
    const onAdd = vi.fn()

    const { container, getByText, getByPlaceholderText } = render(
      <AppShell
        activeSection="Partners"
        activeModule={fashionOsModules[2]}
        openTasks={3}
        query="atelier"
        categoryFilter="Alle"
        statusFilter="Alle"
        onSectionChange={onSelect}
        onQueryChange={onQueryChange}
        onCategoryChange={onCategoryChange}
        onStatusChange={onStatusChange}
        onAdd={onAdd}
        alert="Partnerdaten konnten nicht synchronisiert werden."
      >
        <section>Partner content</section>
      </AppShell>,
    )

    expect(container.querySelector('.app-shell')).toBeTruthy()
    expect(getByText('Fashion OS')).toBeTruthy()
    expect(getByText('Partnerdaten konnten nicht synchronisiert werden.')).toBeTruthy()
    expect(getByText('Partner content')).toBeTruthy()
    expect(getByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeTruthy()

    fireEvent.click(getByText('Sourcing'))
    fireEvent.click(getByText('Neuer Kontakt'))

    expect(onSelect).toHaveBeenCalledWith('Sourcing')
    expect(onAdd).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npx vitest run apps/web/src/app/AppShell.test.tsx
```

Expected: fail because `AppShell.tsx` does not exist.

- [ ] **Step 3: Extract App Shell**

Create `apps/web/src/app/AppShell.tsx` by moving the current `Sidebar` and `Topbar` components and authenticated layout wrapper from `App.tsx`. Keep class names: `app-shell`, `sidebar`, `brand-block`, `side-nav`, `today-label`, `workspace`, `topbar`, `topbar-actions`, and `app-alert`.

- [ ] **Step 4: Run shell test to verify GREEN**

Run:

```bash
npx vitest run apps/web/src/app/AppShell.test.tsx
```

Expected: pass.

## Task 3: Auth Gate And Shared UI Components

**Files:**
- Create: `apps/web/src/app/authState.ts`
- Create: `apps/web/src/app/AuthGate.tsx`
- Create: `apps/web/src/components/Panel.tsx`
- Create: `apps/web/src/components/PartnerTable.tsx`
- Create: `apps/web/src/components/FormControls.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Extract auth state and login gate**

Create `authState.ts` containing `AuthStatus`, `RecordsStatus`, `storageKeys`, `resetStoredStateFromQuery`, `useLocalState`, and `useAdminAuth`. Create `AuthGate.tsx` containing the current `LoginView` markup.

- [ ] **Step 2: Extract reusable components**

Create `Panel.tsx` for `PanelHeader` and `Metric`, `PartnerTable.tsx` for `CompactTable`, and `FormControls.tsx` for `Field` and `RecordForm`.

- [ ] **Step 3: Update App imports and remove moved definitions**

Import the new auth and component modules in `App.tsx`, then remove the moved inline definitions from `App.tsx`.

- [ ] **Step 4: Verify focused web tests**

Run:

```bash
npx vitest run apps/web/src/authApi.test.ts apps/web/src/partnersApi.test.ts apps/web/src/app/AppShell.test.tsx apps/web/src/crmUtils.test.ts
```

Expected: pass.

## Task 4: Section Extraction

**Files:**
- Create: `apps/web/src/sections/command/CommandCenter.tsx`
- Create: `apps/web/src/sections/sourcing/SourcingView.tsx`
- Create: `apps/web/src/sections/partners/PartnersView.tsx`
- Create: `apps/web/src/sections/production/ProductionView.tsx`
- Create: `apps/web/src/sections/foundation/WorkspaceFoundation.tsx`
- Create: `apps/web/src/sections/settings/SettingsView.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Extract active sections**

Move existing `Dashboard`, `TaskList`, `SourcingView`, `AiResearchView`, `BulkImportView`, `ListView`, `DetailPanel`, `PipelineView`, `ProductionView`, `WorkspaceFoundation`, and `SettingsView` into the section files listed above.

- [ ] **Step 2: Keep App orchestration only**

Update `App.tsx` so it owns state, derived filtered records, metrics, task completion, API calls, modal open state, and active-section routing only.

- [ ] **Step 3: Verify section extraction**

Run:

```bash
npx vitest run apps/web/src/app/AppShell.test.tsx apps/web/src/crmUtils.test.ts apps/web/src/aiResearch.test.ts
npm run typecheck -w @agorase/web
```

Expected: pass.

## Task 5: Full Verification And Commit

**Files:**
- All changed Phase 3A files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: pass.

- [ ] **Step 5: Run web bundle secret scan**

Run:

```bash
rg 'ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Expected: no output.

- [ ] **Step 6: Review diff**

Run:

```bash
git status --short
git diff --stat
git diff -- apps/web/src/App.tsx
```

Expected: app code is split into focused modules and `App.tsx` is substantially smaller.

- [ ] **Step 7: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-15-phase-3a-app-architecture-design.md docs/superpowers/plans/2026-05-15-phase-3a-app-architecture.md apps/web/src
git commit -m "refactor: split web app shell and sections"
```

Expected: commit created on `codex/phase-3a-app-architecture`.

## Self-Review

- Spec coverage: The plan covers app shell, auth gate/auth state, API client relocation, shared UI components, section extraction, behavior compatibility, full verification, and commit.
- Placeholder scan: No task uses TBD, TODO, "implement later", or an unspecified "write tests" step.
- Type consistency: Section, module, auth, record, filter, and callback names match the current code and new target files.
