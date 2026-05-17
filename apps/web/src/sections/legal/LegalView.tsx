import { useEffect, useMemo, useState } from 'react'
import {
  LEGAL_COUNTRIES,
  LEGAL_COUNTRY_LABELS,
  LEGAL_NOTE_STATUSES,
  LEGAL_RISK_LEVELS,
  LEGAL_TEMPLATES,
  type FashionRelease,
  type LegalChecklistItem,
  type LegalCountry,
  type LegalNote,
  type LegalNoteStatus,
  type LegalRiskLevel,
  type LegalTemplate,
} from '@agorase/shared'
import {
  createLegalNote,
  deleteLegalNote,
  listLegalNotes,
  updateLegalNote,
} from '../../api/legalApi'
import { listReleases } from '../../api/releasesApi'
import { PanelHeader } from '../../components/Panel'
import type { FashionOsModule } from '../../fashionOs'

type RiskFilter = 'Alle' | LegalRiskLevel
type StatusFilter = 'Alle' | LegalNoteStatus

export function LegalView({ module }: { module: FashionOsModule }) {
  const [notes, setNotes] = useState<LegalNote[]>([])
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('Alle')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Alle')
  const [jurisdictionFilter, setJurisdictionFilter] = useState('Alle')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templateCountryFilter, setTemplateCountryFilter] = useState<LegalCountry | 'Alle'>('Alle')

  const jurisdictions = useMemo(() => {
    const set = new Set<string>()
    for (const note of notes) {
      if (note.jurisdiction) set.add(note.jurisdiction)
    }
    return ['Alle', ...Array.from(set).sort()]
  }, [notes])

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesRisk = riskFilter === 'Alle' || note.riskLevel === riskFilter
      const matchesStatus = statusFilter === 'Alle' || note.status === statusFilter
      const matchesJurisdiction =
        jurisdictionFilter === 'Alle' || note.jurisdiction === jurisdictionFilter
      return matchesRisk && matchesStatus && matchesJurisdiction
    })
  }, [notes, riskFilter, statusFilter, jurisdictionFilter])

  const selectedNote = notes.find((note) => note.id === selectedId) ?? filteredNotes[0] ?? notes[0]

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [loadedNotes, loadedReleases] = await Promise.all([listLegalNotes(), listReleases()])
        if (!active) return
        setNotes(loadedNotes)
        setReleases(loadedReleases)
        setSelectedId((current) => current || loadedNotes[0]?.id || '')
        setStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Legal-Notizen konnten nicht geladen werden.')
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  async function addNote() {
    const note = createEmptyLegalNote()
    try {
      const saved = await createLegalNote(note)
      setNotes((current) => upsertNote(current, saved))
      setSelectedId(saved.id)
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Notiz konnte nicht erstellt werden.')
    }
  }

  async function applyTemplate(template: LegalTemplate) {
    const note = createLegalNoteFromTemplate(template)
    try {
      const saved = await createLegalNote(note)
      setNotes((current) => upsertNote(current, saved))
      setSelectedId(saved.id)
      setTemplatePickerOpen(false)
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(
        caught instanceof Error ? caught.message : 'Vorlage konnte nicht angewendet werden.',
      )
    }
  }

  const visibleTemplates = useMemo(() => {
    if (templateCountryFilter === 'Alle') return LEGAL_TEMPLATES
    return LEGAL_TEMPLATES.filter((template) => template.country === templateCountryFilter)
  }, [templateCountryFilter])

  async function patchNote(patch: Partial<LegalNote>) {
    if (!selectedNote) return
    try {
      const saved = await updateLegalNote(selectedNote.id, { ...selectedNote, ...patch })
      setNotes((current) => upsertNote(current, saved))
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Notiz konnte nicht gespeichert werden.')
    }
  }

  async function removeNote() {
    if (!selectedNote) return
    if (!window.confirm(`Notiz "${selectedNote.title}" wirklich löschen?`)) return
    try {
      await deleteLegalNote(selectedNote.id)
      setNotes((current) => current.filter((note) => note.id !== selectedNote.id))
      setSelectedId('')
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Notiz konnte nicht entfernt werden.')
    }
  }

  function toggleChecklistItem(checklistItemId: string) {
    if (!selectedNote) return
    const nextChecklist = selectedNote.checklist.map((entry) =>
      entry.id === checklistItemId ? { ...entry, done: !entry.done } : entry,
    )
    void patchNote({ checklist: nextChecklist })
  }

  function addChecklistEntry() {
    if (!selectedNote) return
    const entry: LegalChecklistItem = { id: `c-${Date.now()}`, label: 'Neuer Punkt', done: false }
    void patchNote({ checklist: [...selectedNote.checklist, entry] })
  }

  function updateChecklistLabel(checklistItemId: string, label: string) {
    if (!selectedNote) return
    const nextChecklist = selectedNote.checklist.map((entry) =>
      entry.id === checklistItemId ? { ...entry, label } : entry,
    )
    void patchNote({ checklist: nextChecklist })
  }

  function removeChecklistEntry(checklistItemId: string) {
    if (!selectedNote) return
    void patchNote({ checklist: selectedNote.checklist.filter((entry) => entry.id !== checklistItemId) })
  }

  return (
    <section className="legal-layout">
      <aside className="legal-list panel">
        <PanelHeader title="Legal" action="Neue Notiz" onClick={() => void addNote()} />
        <button
          type="button"
          className="legal-template-toggle"
          onClick={() => setTemplatePickerOpen((open) => !open)}
          aria-expanded={templatePickerOpen}
        >
          {templatePickerOpen ? 'Vorlagen-Auswahl schließen' : 'Aus Vorlage anlegen'}
        </button>
        {templatePickerOpen && (
          <div className="legal-template-picker">
            <p className="legal-template-notice">
              Templates sind Startpunkte für die Recherche, keine Rechtsberatung. Inhalte und Quellen
              können sich jederzeit ändern — vor verbindlichem Einsatz immer mit qualifizierter
              Beratung abgleichen.
            </p>
            <div className="legal-template-filters" role="group" aria-label="Land filtern">
              <button
                type="button"
                className={templateCountryFilter === 'Alle' ? 'chip selected' : 'chip'}
                onClick={() => setTemplateCountryFilter('Alle')}
              >
                Alle
              </button>
              {LEGAL_COUNTRIES.map((country) => (
                <button
                  type="button"
                  key={country}
                  className={templateCountryFilter === country ? 'chip selected' : 'chip'}
                  onClick={() => setTemplateCountryFilter(country)}
                >
                  {country} · {LEGAL_COUNTRY_LABELS[country]}
                </button>
              ))}
            </div>
            {!visibleTemplates.length && (
              <div className="empty-state">Keine Vorlagen für diese Auswahl.</div>
            )}
            {visibleTemplates.map((template) => (
              <div className="legal-template-row" key={template.id}>
                <div className="legal-template-meta">
                  <strong>{template.title}</strong>
                  <span>
                    {template.country} · {template.topic} · {template.defaultRiskLevel}
                  </span>
                </div>
                <button type="button" onClick={() => void applyTemplate(template)}>
                  Anwenden
                </button>
              </div>
            ))}
            <button
              type="button"
              className="legal-template-close"
              onClick={() => setTemplatePickerOpen(false)}
            >
              Schließen
            </button>
          </div>
        )}
        <p className="legal-disclaimer">
          <strong>Hinweis:</strong> Diese Sektion ist eine operative Organisation für rechtliche Aufgaben.
          Sie ersetzt <strong>keine Rechtsberatung</strong>. Verbindliche Auskünfte nur durch qualifizierte
          Anwält:innen einholen.
        </p>
        <div className="legal-filters">
          <label>
            Risiko
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
              <option value="Alle">Alle</option>
              {LEGAL_RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="Alle">Alle</option>
              {LEGAL_NOTE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jurisdiction
            <select value={jurisdictionFilter} onChange={(event) => setJurisdictionFilter(event.target.value)}>
              {jurisdictions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!filteredNotes.length && <div className="empty-state">Noch keine Legal-Notizen.</div>}
        {filteredNotes.map((note) => (
          <button
            className={note.id === selectedNote?.id ? 'legal-card selected' : 'legal-card'}
            key={note.id}
            type="button"
            onClick={() => setSelectedId(note.id)}
          >
            <strong>{note.title}</strong>
            <span>
              {note.riskLevel} · {note.status}
            </span>
            <small>{note.jurisdiction || 'Ohne Jurisdiction'}</small>
          </button>
        ))}
      </aside>

      <section className="legal-workspace panel">
        <PanelHeader title={module.label} />
        {status === 'error' && <div className="error-box">{error}</div>}
        {status === 'loading' && <div className="empty-state">Notizen werden geladen.</div>}
        {!selectedNote && status !== 'loading' && (
          <div className="empty-state">Lege eine Notiz an, um rechtliche Aufgaben zu strukturieren.</div>
        )}
        {selectedNote && (
          <>
            <div className="legal-summary">
              <div>
                <span className="label">Risiko</span>
                <strong>{selectedNote.riskLevel}</strong>
              </div>
              <div>
                <span className="label">Status</span>
                <strong>{selectedNote.status}</strong>
              </div>
              <div>
                <span className="label">Offene Punkte</span>
                <strong>{selectedNote.checklist.filter((entry) => !entry.done).length}</strong>
              </div>
            </div>
            <div className="legal-detail-grid">
              <LegalEditor
                note={selectedNote}
                releases={releases}
                onChange={(patch) => void patchNote(patch)}
                onDelete={() => void removeNote()}
              />
              <LegalChecklistEditor
                items={selectedNote.checklist}
                onAdd={addChecklistEntry}
                onToggle={toggleChecklistItem}
                onLabelChange={updateChecklistLabel}
                onRemove={removeChecklistEntry}
              />
            </div>
          </>
        )}
      </section>
    </section>
  )
}

function LegalEditor({
  note,
  releases,
  onChange,
  onDelete,
}: {
  note: LegalNote
  releases: FashionRelease[]
  onChange: (patch: Partial<LegalNote>) => void
  onDelete: () => void
}) {
  return (
    <div className="legal-panel">
      <div className="panel-header compact">
        <h3>Notiz</h3>
        <button type="button" onClick={onDelete}>
          Entfernen
        </button>
      </div>
      <label>
        Titel
        <input value={note.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Topic
          <input value={note.topic} onChange={(event) => onChange({ topic: event.target.value })} />
        </label>
        <label>
          Jurisdiction
          <input
            value={note.jurisdiction}
            onChange={(event) => onChange({ jurisdiction: event.target.value })}
            placeholder="DE, EU, US-CA"
            list="legal-jurisdiction-suggestions"
          />
          <datalist id="legal-jurisdiction-suggestions">
            {LEGAL_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {LEGAL_COUNTRY_LABELS[country]}
              </option>
            ))}
          </datalist>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Risiko
          <select
            value={note.riskLevel}
            onChange={(event) => onChange({ riskLevel: event.target.value as LegalRiskLevel })}
          >
            {LEGAL_RISK_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={note.status}
            onChange={(event) => onChange({ status: event.target.value as LegalNoteStatus })}
          >
            {LEGAL_NOTE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Release
          <select value={note.releaseId} onChange={(event) => onChange({ releaseId: event.target.value })}>
            <option value="">Ohne Release</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Verantwortlich
          <input value={note.responsible} onChange={(event) => onChange({ responsible: event.target.value })} />
        </label>
      </div>
      <label>
        Summary
        <textarea value={note.summary} onChange={(event) => onChange({ summary: event.target.value })} />
      </label>
      <label>
        Detailtext
        <textarea value={note.body} onChange={(event) => onChange({ body: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Nächste Aktion
          <input value={note.nextAction} onChange={(event) => onChange({ nextAction: event.target.value })} />
        </label>
        <label>
          Fällig
          <input
            type="date"
            value={note.nextActionDue}
            onChange={(event) => onChange({ nextActionDue: event.target.value })}
          />
        </label>
      </div>
      <label>
        Quellen (eine URL pro Zeile)
        <textarea
          value={note.sourceLinks}
          onChange={(event) => onChange({ sourceLinks: event.target.value })}
          rows={3}
        />
      </label>
      <label>
        Notizen
        <textarea value={note.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
    </div>
  )
}

function LegalChecklistEditor({
  items,
  onAdd,
  onToggle,
  onLabelChange,
  onRemove,
}: {
  items: LegalChecklistItem[]
  onAdd: () => void
  onToggle: (id: string) => void
  onLabelChange: (id: string, label: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="legal-panel">
      <div className="panel-header compact">
        <h3>Checklist</h3>
        <button type="button" onClick={onAdd}>
          Neuer Punkt
        </button>
      </div>
      {!items.length && <div className="empty-state">Noch keine Punkte.</div>}
      {items.map((entry) => (
        <div className="legal-checklist-row" key={entry.id}>
          <input
            type="checkbox"
            checked={entry.done}
            onChange={() => onToggle(entry.id)}
            aria-label={`Punkt ${entry.label} abhaken`}
          />
          <input value={entry.label} onChange={(event) => onLabelChange(entry.id, event.target.value)} />
          <button type="button" onClick={() => onRemove(entry.id)}>
            Entfernen
          </button>
        </div>
      ))}
    </div>
  )
}

function createLegalNoteFromTemplate(template: LegalTemplate): LegalNote {
  const now = new Date().toISOString()
  const stamp = Date.now()
  return {
    id: `legal-${stamp}`,
    title: template.title,
    topic: template.topic,
    jurisdiction: template.country,
    riskLevel: template.defaultRiskLevel,
    status: template.defaultStatus,
    summary: template.summary,
    body: template.body,
    checklist: template.checklist.map((label, index) => ({
      id: `c-${stamp}-${index}`,
      label,
      done: false,
    })),
    sourceLinks: template.sourceLinks.join('\n'),
    nextAction: template.defaultNextAction,
    nextActionDue: '',
    responsible: '',
    releaseId: '',
    partnerId: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function createEmptyLegalNote(): LegalNote {
  const now = new Date().toISOString()
  return {
    id: `legal-${Date.now()}`,
    title: 'Neue Legal-Notiz',
    topic: '',
    jurisdiction: 'DE',
    riskLevel: 'medium',
    status: 'open',
    summary: '',
    body: '',
    checklist: [],
    sourceLinks: '',
    nextAction: '',
    nextActionDue: '',
    responsible: '',
    releaseId: '',
    partnerId: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function upsertNote(notes: LegalNote[], next: LegalNote) {
  return notes.some((note) => note.id === next.id)
    ? notes.map((note) => (note.id === next.id ? next : note))
    : [...notes, next]
}
