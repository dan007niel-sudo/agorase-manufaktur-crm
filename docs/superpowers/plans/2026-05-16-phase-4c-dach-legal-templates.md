# Phase 4C — DACH Legal Templates (Plan)

Branch: `codex/phase-4c-dach-legal`. Baseline: 45 files / 286 tests pass.

## Steps

1. **Shared module** — create `packages/shared/src/legalTemplates.ts` with
   `LegalCountry`, `LegalTemplate`, `LEGAL_COUNTRIES`,
   `LEGAL_COUNTRY_LABELS`, the 18-entry `LEGAL_TEMPLATES` array, and
   `legalTemplatesByCountry`. Re-export from `packages/shared/src/index.ts`.
2. **Shared tests** — `legalTemplates.test.ts` covering count, per-country
   counts, unique ids, required fields, ≥3 checklist + ≥1 source per
   template, `https://` source prefix, and risk/status enum membership.
3. **UI picker** — extend `LegalView.tsx`:
   - Add `templatePickerOpen` and `templateCountryFilter` state.
   - Render the toggle button + inline picker below the existing
     `PanelHeader` ("Neue Notiz") in the list panel.
   - Picker uses `.chip` for country filters (DE / AT / CH / EU + Alle),
     lists rows for the visible templates, and exposes "Anwenden" and
     "Schließen" buttons.
   - "Anwenden" maps a template to a `LegalNote` via
     `createLegalNoteFromTemplate`, calls `createLegalNote`, selects the
     saved note, and dismisses the picker.
4. **Jurisdiction polish** — replace the editor's plain jurisdiction
   `<input>` with one that references a `<datalist>` of DACH/EU codes.
   The input stays a free-text field so custom values still work.
5. **CSS** — add `.legal-template-toggle`, `.legal-template-picker`,
   `.legal-template-notice`, `.legal-template-filters`,
   `.legal-template-row`, `.legal-template-meta`, `.legal-template-close`
   to `App.css`. Reuse existing `.chip` and the warm `#fffdf8 / #f4efe4`
   tokens.
6. **Docs** — this plan + the matching design spec.
7. **Verification** — `npm test`, `npm run typecheck`, `npm run build`,
   `npm run lint`, then the web-bundle secret scan from the deploy gate.

## Out-of-scope

- No DB table for templates, no API route.
- No automated source-URL liveness check.
- No React-level tests for the picker (matches the existing legal
  section, which has no React tests).
