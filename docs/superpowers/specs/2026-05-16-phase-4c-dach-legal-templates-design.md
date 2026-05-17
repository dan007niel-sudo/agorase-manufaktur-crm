# Phase 4C — DACH Legal Templates (Design)

## Problem

The Legal Orientation section (Phase 3F) gives operators a free-form note
editor with risk levels, statuses, and checklists, but it ships empty.
For a German/Austrian/Swiss fashion brand the same 5–6 legal pillars
(Impressum, Datenschutz, AGB, Widerruf/Rücktritt, Verpackung,
Markenrecht) recur every release. Re-typing them by hand is slow and
loses the references to the actual source statutes.

## Goal

Ship 18 curated DACH legal templates (6 × DE/AT/CH) that an operator can
stamp out into a real `LegalNote` with one click. Templates carry a
title, topic tag, default risk level + status, German summary + body,
checklist labels, and source URLs.

## Non-goals

- No DB table, no CRUD on templates — curated content lives in code.
- No new shared types beyond `LegalCountry` / `LegalTemplate`.
- No new API routes; the picker calls the existing `createLegalNote`.
- No automated source-link freshness check.
- No localization framework; German strings inline per project convention.

## Surface

1. **`packages/shared/src/legalTemplates.ts`** — type definitions
   (`LegalCountry`, `LegalTemplate`), the `LEGAL_TEMPLATES` array (18
   entries), `LEGAL_COUNTRIES` + `LEGAL_COUNTRY_LABELS`, and a small
   `legalTemplatesByCountry` helper. Re-exported from the shared barrel.
2. **`apps/web/src/sections/legal/LegalView.tsx`** — adds an
   "Aus Vorlage anlegen" button below the list-panel header. Clicking
   toggles an inline picker (no modal) with:
   - A chip filter row over `Alle | DE | AT | CH | EU`, reusing the
     `.chip` class so Phase 4B styling applies automatically.
   - One row per template with title, country/topic/risk metadata, and
     an "Anwenden" button.
   - A bold "Templates sind Startpunkte … keine Rechtsberatung" notice
     at the top of the picker.
   - A "Schließen" button.
3. **Jurisdiction polish** — the editor's jurisdiction `<input>` now
   carries a `<datalist>` of `LEGAL_COUNTRIES` so DACH codes auto-suggest
   while custom values (e.g. `US-CA`) remain typeable.

## Mapping template → LegalNote

| Template field        | Note field                                  |
| --------------------- | ------------------------------------------- |
| `title`               | `title`                                     |
| `topic`               | `topic`                                     |
| `country`             | `jurisdiction`                              |
| `defaultRiskLevel`    | `riskLevel`                                 |
| `defaultStatus`       | `status`                                    |
| `summary`             | `summary`                                   |
| `body`                | `body`                                      |
| `checklist[]`         | `checklist[]` (ids generated at apply-time) |
| `sourceLinks[]`       | `sourceLinks` (newline-joined string)       |
| `defaultNextAction`   | `nextAction`                                |

`id` is generated `legal-${Date.now()}` to match the existing empty-note
factory. All remaining note fields stay empty/default.

## Tests

Shared-level only (`packages/shared/src/legalTemplates.test.ts`):

- Exactly 18 templates, 6 per DACH country, 0 for EU.
- All ids unique.
- Title/topic/summary/body/defaultNextAction non-empty.
- Each template has ≥3 checklist items and ≥1 source link.
- All source links `https://`-prefixed.
- `defaultRiskLevel ∈ LEGAL_RISK_LEVELS`,
  `defaultStatus ∈ LEGAL_NOTE_STATUSES`.

The picker UI is not unit-tested (consistent with the existing legal
section which has no React-level tests). The mapping logic is small and
straightforward; behavior is verified end-to-end through `npm run build`
and manual smoke tests.

## Risks

- Templates are not legal advice; the picker shows a prominent notice
  inside the picker and the existing yellow disclaimer remains in place
  below it. Operators must still consult a Fachanwält:in.
- Source statute URLs drift over time. Picker copy explicitly tells
  users sources can change.
