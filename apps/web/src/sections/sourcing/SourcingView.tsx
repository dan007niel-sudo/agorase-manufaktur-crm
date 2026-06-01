import { useMemo, useState } from 'react'
import type { ResearchQualityStatus, VerifiedField } from '@agorase/shared'
import {
  requestAiManufactories,
  suggestionToManufacture,
  type AiResearchCriteria,
  type AiResearchSuggestion,
} from '../../aiResearch'
import { parseBulkImport } from '../../crmUtils'
import { PanelHeader } from '../../components/Panel'
import { PartnerTable } from '../../components/PartnerTable'
import { categories, type Category, type Manufactory } from '../../types'

/**
 * Manufaktur Scout (formerly Sourcing). Renders KI-Recherche with the RHE server-side
 * quality gate: each hit shows a research score and per-field verification status.
 *
 * The `onAiImport` callback both upserts the partner into the persisted CRM and is expected
 * to navigate the user to the Partners tab — App.tsx handles that side-effect. We don't
 * navigate from here so the parent can decide (Plan B in this phase: tab switch).
 */
export function SourcingView({
  onAiImport,
  onBulkImport,
}: {
  onAiImport: (records: Manufactory[]) => void | Promise<void>
  onBulkImport: (records: Manufactory[]) => void | Promise<void>
}) {
  return (
    <section className="sourcing-layout">
      <AiResearchView onImport={onAiImport} />
      <BulkImportView onImport={onBulkImport} />
    </section>
  )
}

function AiResearchView({ onImport }: { onImport: (records: Manufactory[]) => void | Promise<void> }) {
  const [criteria, setCriteria] = useState<AiResearchCriteria>({
    categories: ['Streetwear', 'Ready-to-Wear', 'Schmuck'],
    regions: 'DACH, Norditalien, Benelux',
    productFocus: 'zeitgenoessische Streetwear, Ready-to-Wear, Accessoires und kleine Capsule Drops',
    priceLevel: 'Premium',
    count: 8,
    europeFocus: true,
  })
  const [suggestions, setSuggestions] = useState<AiResearchSuggestion[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  async function runResearch() {
    setStatus('loading')
    setError('')

    try {
      const nextSuggestions = await requestAiManufactories({ criteria })
      setSuggestions(nextSuggestions)
      setSelectedNames(nextSuggestions.map((suggestion) => suggestion.name))
      setStatus('idle')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'KI-Recherche fehlgeschlagen.')
      setStatus('error')
    }
  }

  function toggleCategory(category: Category) {
    setCriteria((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }))
  }

  const selectedSuggestions = suggestions.filter((suggestion) => selectedNames.includes(suggestion.name))

  return (
    <section className="ai-research-layout">
      <div className="panel ai-control-panel">
        <PanelHeader title="Manufaktur Scout" />
        <p className="helper-copy">
          KI-Recherche mit Verifikationsstatus pro Kontakt-Feld. Übernimm geprüfte Treffer in
          die Partners-Pipeline.
        </p>
        <label>
          Regionen / Länder
          <input
            value={criteria.regions}
            onChange={(event) => setCriteria((current) => ({ ...current, regions: event.target.value }))}
          />
        </label>
        <label>
          Fashion-Fokus
          <textarea
            value={criteria.productFocus}
            onChange={(event) => setCriteria((current) => ({ ...current, productFocus: event.target.value }))}
          />
        </label>
        <div className="form-grid two">
          <label>
            Preisniveau
            <select
              value={criteria.priceLevel}
              onChange={(event) =>
                setCriteria((current) => ({ ...current, priceLevel: event.target.value as AiResearchCriteria['priceLevel'] }))
              }
            >
              <option>Alle</option>
              <option>Budget</option>
              <option>Mittel</option>
              <option>Premium</option>
              <option>Luxus</option>
            </select>
          </label>
          <label>
            Anzahl
            <input
              type="number"
              min="3"
              max="20"
              value={criteria.count}
              onChange={(event) => setCriteria((current) => ({ ...current, count: Number(event.target.value) }))}
            />
          </label>
        </div>
        <label className="europe-toggle">
          <input
            type="checkbox"
            checked={Boolean(criteria.europeFocus)}
            onChange={(event) =>
              setCriteria((current) => ({ ...current, europeFocus: event.target.checked }))
            }
          />
          Europa-Fokus (EU/EEA/UK/CH bevorzugen)
        </label>
        <div className="category-picker">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={criteria.categories.includes(category) ? 'selected' : ''}
              aria-pressed={criteria.categories.includes(category)}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {status === 'error' && <div className="error-box">{error}</div>}
        <button type="button" className="primary-button" onClick={runResearch} disabled={status === 'loading'}>
          {status === 'loading' ? 'KI sucht...' : 'Manufakturen recherchieren'}
        </button>
      </div>

      <div className="panel">
        <PanelHeader title="KI-Vorschläge" />
        {!suggestions.length && (
          <div className="empty-state">
            Noch keine Vorschläge. Starte eine KI-Recherche mit Kategorien, Region und Fashion-Fokus.
          </div>
        )}
        <div className="ai-suggestion-list">
          {suggestions.map((suggestion) => (
            <ScoutCard
              key={suggestion.name}
              suggestion={suggestion}
              selected={selectedNames.includes(suggestion.name)}
              onToggle={() =>
                setSelectedNames((current) =>
                  current.includes(suggestion.name)
                    ? current.filter((name) => name !== suggestion.name)
                    : [...current, suggestion.name],
                )
              }
            />
          ))}
        </div>
        {!!suggestions.length && (
          <button
            type="button"
            className="primary-button import-ai-button"
            disabled={!selectedSuggestions.length}
            onClick={() => void onImport(selectedSuggestions.map(suggestionToManufacture))}
          >
            In Partners übernehmen ({selectedSuggestions.length})
          </button>
        )}
      </div>
    </section>
  )
}

function ScoutCard({
  suggestion,
  selected,
  onToggle,
}: {
  suggestion: AiResearchSuggestion
  selected: boolean
  onToggle: () => void
}) {
  const research = suggestion.researchQuality
  const verification = suggestion.verification
  const score = suggestion.score ?? research?.score
  return (
    <article className="ai-suggestion">
      <label className="select-line">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <strong>{suggestion.name}</strong>
        {typeof score === 'number' && (
          <span className={`scout-score ${qualityClass(research?.status)}`}>{score}/100</span>
        )}
      </label>
      <div className="suggestion-meta">
        <span>{suggestion.category}</span>
        <span>{[suggestion.city, suggestion.country].filter(Boolean).join(', ')}</span>
        <span>Fit {suggestion.brandFit}</span>
        <span>{suggestion.confidence}% KI-Konfidenz</span>
      </div>
      <p>{suggestion.rationale}</p>
      {verification && (
        <dl className="scout-verification">
          <VerifyRow label="Anschrift" field={verification.address} />
          <VerifyRow label="Website" field={verification.website} />
          <VerifyRow label="Kontaktseite" field={verification.contactPage} />
          <VerifyRow label="E-Mail" field={verification.email} />
          <VerifyRow label="Telefon" field={verification.phone} />
          <VerifyRow label="Ansprechpartner" field={verification.contactPerson} />
        </dl>
      )}
      {research && research.warnings.length > 0 && (
        <div className="scout-warnings">
          {research.warnings.slice(0, 3).map((warning) => (
            <small key={warning}>⚠ {warning}</small>
          ))}
        </div>
      )}
      <div className="source-list">
        {suggestion.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            {source.title || source.url}
          </a>
        ))}
      </div>
    </article>
  )
}

function VerifyRow({ label, field }: { label: string; field: VerifiedField }) {
  return (
    <div className="scout-verify-row">
      <dt>{label}</dt>
      <dd>
        <span>{field.value}</span>
        <span className={`verify-pill ${field.status}`}>
          {verifyLabel(field.status)} · {field.confidence}%
        </span>
      </dd>
    </div>
  )
}

function verifyLabel(status: VerifiedField['status']): string {
  if (status === 'verified') return 'verifiziert'
  if (status === 'partial') return 'teilweise'
  return 'offen'
}

function qualityClass(status: ResearchQualityStatus | undefined): string {
  return status ?? ''
}

function BulkImportView({ onImport }: { onImport: (records: Manufactory[]) => void | Promise<void> }) {
  const [raw, setRaw] = useState('Name\tKategorie\tStadt\tE-Mail\tStatus\tPriorität\nNeue Werkstatt\tKeramik\tBerlin\thello@example.com\tKontakt gefunden\tA')
  const preview = useMemo(() => parseBulkImport(raw), [raw])

  return (
    <section className="split-view">
      <div className="panel">
        <PanelHeader title="Bulk-Import" />
        <textarea className="import-box" value={raw} onChange={(event) => setRaw(event.target.value)} />
        <button type="button" className="primary-button" onClick={() => void onImport(preview)} disabled={!preview.length}>
          {preview.length} Zeilen importieren
        </button>
      </div>
      <div className="panel">
        <PanelHeader title="Vorschau" />
        <PartnerTable records={preview} onSelect={() => undefined} />
      </div>
    </section>
  )
}
