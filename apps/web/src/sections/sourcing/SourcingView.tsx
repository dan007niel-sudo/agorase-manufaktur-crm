import { useMemo, useState } from 'react'
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
        <PanelHeader title="KI-Recherche" />
        <p className="helper-copy">
          Lass dir passende Labels, Ateliers, Hersteller und Fashion-Partner per interner Recherche vorschlagen und übernimm die besten Treffer direkt in die Partnerliste.
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
          {status === 'loading' ? 'KI sucht...' : 'Fashion-Partner suchen lassen'}
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
            <article className="ai-suggestion" key={suggestion.name}>
              <label className="select-line">
                <input
                  type="checkbox"
                  checked={selectedNames.includes(suggestion.name)}
                  onChange={() =>
                    setSelectedNames((current) =>
                      current.includes(suggestion.name)
                        ? current.filter((name) => name !== suggestion.name)
                        : [...current, suggestion.name],
                    )
                  }
                />
                <strong>{suggestion.name}</strong>
              </label>
              <div className="suggestion-meta">
                <span>{suggestion.category}</span>
                <span>{[suggestion.city, suggestion.country].filter(Boolean).join(', ')}</span>
                <span>Fit {suggestion.brandFit}</span>
                <span>{suggestion.confidence}%</span>
              </div>
              <p>{suggestion.rationale}</p>
              <div className="source-list">
                {suggestion.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank">
                    {source.title || source.url}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!!suggestions.length && (
          <button
            type="button"
            className="primary-button import-ai-button"
            disabled={!selectedSuggestions.length}
            onClick={() => void onImport(selectedSuggestions.map(suggestionToManufacture))}
          >
            {selectedSuggestions.length} Vorschläge übernehmen
          </button>
        )}
      </div>
    </section>
  )
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
