import { useEffect, useMemo, useState } from 'react'
import {
  CREATIVE_BRIEF_STATUSES,
  type CreativeBrief,
  type CreativeBriefStatus,
  type CreativeDirection,
  type FashionRelease,
  type PromptTemplate,
} from '@agorase/shared'
import {
  brainstormDirections,
  createCreativeBrief,
  createCreativeDirection,
  createPromptTemplate,
  deleteCreativeBrief,
  deleteCreativeDirection,
  deletePromptTemplate,
  listCreativeBriefs,
  listCreativeDirections,
  listPromptTemplates,
  updateCreativeBrief,
  updateCreativeDirection,
  updatePromptTemplate,
} from '../../api/creativeApi'
import { listReleases } from '../../api/releasesApi'
import { PanelHeader } from '../../components/Panel'
import type { FashionOsModule } from '../../fashionOs'

const STATUS_FILTERS: Array<'Alle' | CreativeBriefStatus> = ['Alle', ...CREATIVE_BRIEF_STATUSES]

export function CreativeLabView({ module }: { module: FashionOsModule }) {
  const [briefs, setBriefs] = useState<CreativeBrief[]>([])
  const [directions, setDirections] = useState<CreativeDirection[]>([])
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [selectedBriefId, setSelectedBriefId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Alle' | CreativeBriefStatus>('Alle')
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [brainstormPrompt, setBrainstormPrompt] = useState('')
  const [brainstormTemplateId, setBrainstormTemplateId] = useState('')
  const [brainstormCount, setBrainstormCount] = useState(3)
  const [brainstormRunning, setBrainstormRunning] = useState(false)
  const [pendingDirections, setPendingDirections] = useState<CreativeDirection[]>([])

  const filteredBriefs = useMemo(() => {
    return briefs.filter((brief) => statusFilter === 'Alle' || brief.status === statusFilter)
  }, [briefs, statusFilter])

  const selectedBrief =
    briefs.find((brief) => brief.id === selectedBriefId) ?? filteredBriefs[0] ?? briefs[0]

  const savedDirectionsForSelected = useMemo(
    () => directions.filter((direction) => direction.briefId === selectedBrief?.id && direction.saved),
    [directions, selectedBrief],
  )

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [loadedBriefs, loadedDirections, loadedTemplates, loadedReleases] = await Promise.all([
          listCreativeBriefs(),
          listCreativeDirections(),
          listPromptTemplates(),
          listReleases(),
        ])
        if (!active) return
        setBriefs(loadedBriefs)
        setDirections(loadedDirections)
        setTemplates(loadedTemplates)
        setReleases(loadedReleases)
        setSelectedBriefId((current) => current || loadedBriefs[0]?.id || '')
        setLoadStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setLoadStatus('error')
        setError(caught instanceof Error ? caught.message : 'Creative Lab konnte nicht geladen werden.')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function addBrief() {
    const brief = createEmptyBrief()
    try {
      const saved = await createCreativeBrief(brief)
      setBriefs((current) => upsertBrief(current, saved))
      setSelectedBriefId(saved.id)
      setPendingDirections([])
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Brief konnte nicht angelegt werden.')
      setLoadStatus('error')
    }
  }

  async function patchBrief(patch: Partial<CreativeBrief>) {
    if (!selectedBrief) return
    try {
      const saved = await updateCreativeBrief(selectedBrief.id, { ...selectedBrief, ...patch })
      setBriefs((current) => upsertBrief(current, saved))
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Brief konnte nicht gespeichert werden.')
      setLoadStatus('error')
    }
  }

  async function removeBrief() {
    if (!selectedBrief) return
    try {
      await deleteCreativeBrief(selectedBrief.id)
      setBriefs((current) => current.filter((brief) => brief.id !== selectedBrief.id))
      setSelectedBriefId('')
      setPendingDirections([])
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Brief konnte nicht entfernt werden.')
      setLoadStatus('error')
    }
  }

  async function runBrainstorm() {
    if (!selectedBrief) return
    const promptValue = brainstormPrompt.trim()
    if (!promptValue) {
      setError('Bitte gib einen Prompt für das Brainstorming ein.')
      setLoadStatus('error')
      return
    }
    setBrainstormRunning(true)
    setError('')
    try {
      const result = await brainstormDirections({
        brief_id: selectedBrief.id,
        prompt: promptValue,
        template_id: brainstormTemplateId || undefined,
        count: brainstormCount,
      })
      setPendingDirections(result.directions)
      if (selectedBrief.status === 'draft') {
        await patchBrief({ status: 'exploring' })
      }
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Brainstorming fehlgeschlagen.')
      setLoadStatus('error')
    } finally {
      setBrainstormRunning(false)
    }
  }

  async function saveDirection(direction: CreativeDirection) {
    try {
      const saved = await createCreativeDirection({ ...direction, saved: true })
      setDirections((current) => upsertDirection(current, saved))
      setPendingDirections((current) => current.filter((entry) => entry.id !== direction.id))
      if (selectedBrief && selectedBrief.status === 'exploring') {
        await patchBrief({ status: 'directions-saved' })
      }
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Direction konnte nicht gespeichert werden.')
      setLoadStatus('error')
    }
  }

  function discardDirection(directionId: string) {
    setPendingDirections((current) => current.filter((entry) => entry.id !== directionId))
  }

  async function patchSavedDirection(direction: CreativeDirection, patch: Partial<CreativeDirection>) {
    try {
      const saved = await updateCreativeDirection(direction.id, { ...direction, ...patch })
      setDirections((current) => upsertDirection(current, saved))
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Direction konnte nicht aktualisiert werden.')
      setLoadStatus('error')
    }
  }

  async function removeSavedDirection(directionId: string) {
    try {
      await deleteCreativeDirection(directionId)
      setDirections((current) => current.filter((entry) => entry.id !== directionId))
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Direction konnte nicht entfernt werden.')
      setLoadStatus('error')
    }
  }

  async function addTemplate() {
    const template = createEmptyTemplate()
    try {
      const saved = await createPromptTemplate(template)
      setTemplates((current) => upsertTemplate(current, saved))
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prompt-Template konnte nicht angelegt werden.')
      setLoadStatus('error')
    }
  }

  async function patchTemplate(template: PromptTemplate, patch: Partial<PromptTemplate>) {
    try {
      const saved = await updatePromptTemplate(template.id, { ...template, ...patch })
      setTemplates((current) => upsertTemplate(current, saved))
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prompt-Template konnte nicht gespeichert werden.')
      setLoadStatus('error')
    }
  }

  async function removeTemplate(id: string) {
    try {
      await deletePromptTemplate(id)
      setTemplates((current) => current.filter((entry) => entry.id !== id))
      if (brainstormTemplateId === id) setBrainstormTemplateId('')
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prompt-Template konnte nicht entfernt werden.')
      setLoadStatus('error')
    }
  }

  return (
    <section className="creative-lab-layout">
      <aside className="creative-lab-list panel">
        <PanelHeader title="Briefs" action="Neuer Brief" onClick={() => void addBrief()} />
        <div className="creative-lab-filters">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={status === statusFilter ? 'chip selected' : 'chip'}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        {!filteredBriefs.length && <div className="empty-state">Noch keine Briefs in diesem Status.</div>}
        {filteredBriefs.map((brief) => (
          <button
            key={brief.id}
            type="button"
            className={brief.id === selectedBrief?.id ? 'creative-lab-card selected' : 'creative-lab-card'}
            onClick={() => {
              setSelectedBriefId(brief.id)
              setPendingDirections([])
            }}
          >
            <strong>{brief.title}</strong>
            <span>{brief.status}</span>
            <small>{brief.season || 'Ohne Saison'}</small>
          </button>
        ))}
      </aside>

      <section className="creative-lab-workspace panel">
        <PanelHeader title={module.label} />
        {loadStatus === 'loading' && <div className="empty-state">Creative Lab wird geladen.</div>}
        {error && <div className="error-box">{error}</div>}
        {!selectedBrief && loadStatus !== 'loading' && (
          <div className="empty-state">Lege einen Brief an, um Brainstormings zu starten.</div>
        )}
        {selectedBrief && (
          <>
            <BriefEditor
              brief={selectedBrief}
              releases={releases}
              onChange={(patch) => void patchBrief(patch)}
              onDelete={() => void removeBrief()}
            />
            <BrainstormPanel
              prompt={brainstormPrompt}
              templates={templates}
              templateId={brainstormTemplateId}
              count={brainstormCount}
              running={brainstormRunning}
              onPromptChange={setBrainstormPrompt}
              onTemplateChange={setBrainstormTemplateId}
              onCountChange={setBrainstormCount}
              onRun={() => void runBrainstorm()}
            />
            <PromptTemplatePanel
              templates={templates}
              onAdd={() => void addTemplate()}
              onChange={(template, patch) => void patchTemplate(template, patch)}
              onRemove={(id) => void removeTemplate(id)}
            />
          </>
        )}
      </section>

      <aside className="creative-lab-directions panel">
        <PanelHeader title="Directions" />
        {selectedBrief ? (
          <DirectionsPanel
            pending={pendingDirections}
            saved={savedDirectionsForSelected}
            onSave={(direction) => void saveDirection(direction)}
            onDiscard={discardDirection}
            onPatch={(direction, patch) => void patchSavedDirection(direction, patch)}
            onRemove={(id) => void removeSavedDirection(id)}
          />
        ) : (
          <div className="empty-state">Kein Brief ausgewählt.</div>
        )}
      </aside>
    </section>
  )
}

function BriefEditor({
  brief,
  releases,
  onChange,
  onDelete,
}: {
  brief: CreativeBrief
  releases: FashionRelease[]
  onChange: (patch: Partial<CreativeBrief>) => void
  onDelete: () => void
}) {
  return (
    <div className="creative-lab-panel">
      <div className="panel-header compact">
        <h3>Brief</h3>
        <button type="button" onClick={onDelete}>
          Entfernen
        </button>
      </div>
      <label>
        Titel
        <input value={brief.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Status
          <select
            value={brief.status}
            onChange={(event) => onChange({ status: event.target.value as CreativeBriefStatus })}
          >
            {CREATIVE_BRIEF_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Saison
          <input value={brief.season} onChange={(event) => onChange({ season: event.target.value })} />
        </label>
      </div>
      <label>
        Release
        <select value={brief.releaseId} onChange={(event) => onChange({ releaseId: event.target.value })}>
          <option value="">Ohne Release</option>
          {releases.map((release) => (
            <option key={release.id} value={release.id}>
              {release.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ziel
        <textarea value={brief.goal} onChange={(event) => onChange({ goal: event.target.value })} />
      </label>
      <label>
        Zielgruppe
        <textarea value={brief.audience} onChange={(event) => onChange({ audience: event.target.value })} />
      </label>
      <label>
        Tonalität
        <textarea value={brief.tone} onChange={(event) => onChange({ tone: event.target.value })} />
      </label>
      <label>
        Referenzen
        <textarea
          value={brief.references}
          onChange={(event) => onChange({ references: event.target.value })}
        />
      </label>
      <label>
        Notizen
        <textarea value={brief.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
    </div>
  )
}

function BrainstormPanel({
  prompt,
  templates,
  templateId,
  count,
  running,
  onPromptChange,
  onTemplateChange,
  onCountChange,
  onRun,
}: {
  prompt: string
  templates: PromptTemplate[]
  templateId: string
  count: number
  running: boolean
  onPromptChange: (value: string) => void
  onTemplateChange: (value: string) => void
  onCountChange: (value: number) => void
  onRun: () => void
}) {
  return (
    <div className="creative-lab-panel">
      <h3>Brainstorming</h3>
      <label>
        Prompt
        <textarea
          value={prompt}
          rows={4}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="z. B. SS27 Capsule für ruhige Schichtensilhouetten"
        />
      </label>
      <div className="form-grid two">
        <label>
          Prompt-Template
          <select value={templateId} onChange={(event) => onTemplateChange(event.target.value)}>
            <option value="">Ohne Template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Anzahl
          <select
            value={String(count)}
            onChange={(event) => onCountChange(Number(event.target.value) || 3)}
          >
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" disabled={running} onClick={onRun}>
        {running ? 'Generiere…' : 'Vorschläge generieren'}
      </button>
    </div>
  )
}

function PromptTemplatePanel({
  templates,
  onAdd,
  onChange,
  onRemove,
}: {
  templates: PromptTemplate[]
  onAdd: () => void
  onChange: (template: PromptTemplate, patch: Partial<PromptTemplate>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="creative-lab-panel">
      <div className="panel-header compact">
        <h3>Prompt-Templates</h3>
        <button type="button" onClick={onAdd}>
          Neues Template
        </button>
      </div>
      {!templates.length && <div className="empty-state">Noch keine Templates.</div>}
      {templates.map((template) => (
        <div className="creative-lab-template" key={template.id}>
          <label>
            Name
            <input
              value={template.name}
              onChange={(event) => onChange(template, { name: event.target.value })}
            />
          </label>
          <label>
            Kategorie
            <input
              value={template.category}
              onChange={(event) => onChange(template, { category: event.target.value })}
            />
          </label>
          <label>
            Body
            <textarea
              value={template.body}
              onChange={(event) => onChange(template, { body: event.target.value })}
            />
          </label>
          <button type="button" onClick={() => onRemove(template.id)}>
            Entfernen
          </button>
        </div>
      ))}
    </div>
  )
}

function DirectionsPanel({
  pending,
  saved,
  onSave,
  onDiscard,
  onPatch,
  onRemove,
}: {
  pending: CreativeDirection[]
  saved: CreativeDirection[]
  onSave: (direction: CreativeDirection) => void
  onDiscard: (id: string) => void
  onPatch: (direction: CreativeDirection, patch: Partial<CreativeDirection>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="creative-lab-directions-list">
      {!pending.length && !saved.length && <div className="empty-state">Noch keine Directions.</div>}
      {pending.length > 0 && (
        <>
          <h4>Vorschläge</h4>
          {pending.map((direction) => (
            <div className="creative-lab-direction-card pending" key={direction.id}>
              <strong>{direction.title}</strong>
              {direction.summary && <p>{direction.summary}</p>}
              {direction.keywords && <small>Keywords: {direction.keywords}</small>}
              {direction.palette && <small>Palette: {direction.palette}</small>}
              {direction.materials && <small>Materialien: {direction.materials}</small>}
              {direction.silhouettes && <small>Silhouetten: {direction.silhouettes}</small>}
              {direction.body && <details>
                <summary>Body</summary>
                <pre>{direction.body}</pre>
              </details>}
              <div className="creative-lab-direction-actions">
                <button type="button" onClick={() => onSave(direction)}>
                  Speichern
                </button>
                <button type="button" onClick={() => onDiscard(direction.id)}>
                  Verwerfen
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {saved.length > 0 && (
        <>
          <h4>Gespeichert</h4>
          {saved.map((direction) => (
            <SavedDirectionCard
              key={direction.id}
              direction={direction}
              onPatch={onPatch}
              onRemove={onRemove}
            />
          ))}
        </>
      )}
    </div>
  )
}

function SavedDirectionCard({
  direction,
  onPatch,
  onRemove,
}: {
  direction: CreativeDirection
  onPatch: (direction: CreativeDirection, patch: Partial<CreativeDirection>) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  if (!editing) {
    return (
      <div className="creative-lab-direction-card saved">
        <strong>{direction.title}</strong>
        {direction.summary && <p>{direction.summary}</p>}
        {direction.keywords && <small>Keywords: {direction.keywords}</small>}
        {direction.palette && <small>Palette: {direction.palette}</small>}
        <div className="creative-lab-direction-actions">
          <button type="button" onClick={() => setEditing(true)}>
            Bearbeiten
          </button>
          <button type="button" onClick={() => onRemove(direction.id)}>
            Löschen
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="creative-lab-direction-card saved editing">
      <label>
        Titel
        <input
          value={direction.title}
          onChange={(event) => onPatch(direction, { title: event.target.value })}
        />
      </label>
      <label>
        Summary
        <textarea
          value={direction.summary}
          onChange={(event) => onPatch(direction, { summary: event.target.value })}
        />
      </label>
      <label>
        Keywords
        <input
          value={direction.keywords}
          onChange={(event) => onPatch(direction, { keywords: event.target.value })}
        />
      </label>
      <label>
        Palette
        <input
          value={direction.palette}
          onChange={(event) => onPatch(direction, { palette: event.target.value })}
        />
      </label>
      <label>
        Materialien
        <input
          value={direction.materials}
          onChange={(event) => onPatch(direction, { materials: event.target.value })}
        />
      </label>
      <label>
        Silhouetten
        <input
          value={direction.silhouettes}
          onChange={(event) => onPatch(direction, { silhouettes: event.target.value })}
        />
      </label>
      <label>
        Body
        <textarea
          value={direction.body}
          onChange={(event) => onPatch(direction, { body: event.target.value })}
        />
      </label>
      <div className="creative-lab-direction-actions">
        <button type="button" onClick={() => setEditing(false)}>
          Fertig
        </button>
        <button type="button" onClick={() => onRemove(direction.id)}>
          Löschen
        </button>
      </div>
    </div>
  )
}

function createEmptyBrief(): CreativeBrief {
  const now = new Date().toISOString()
  return {
    id: `brief-${Date.now()}`,
    title: 'Neuer Brief',
    goal: '',
    audience: '',
    tone: '',
    references: '',
    season: '',
    releaseId: '',
    status: 'draft',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function createEmptyTemplate(): PromptTemplate {
  const now = new Date().toISOString()
  return {
    id: `tmpl-${Date.now()}`,
    name: 'Neues Template',
    description: '',
    category: '',
    body: 'Beschreibe das gewünschte Brainstorming.',
    createdAt: now,
    updatedAt: now,
  }
}

function upsertBrief(briefs: CreativeBrief[], next: CreativeBrief) {
  return briefs.some((brief) => brief.id === next.id)
    ? briefs.map((brief) => (brief.id === next.id ? next : brief))
    : [...briefs, next]
}

function upsertDirection(directions: CreativeDirection[], next: CreativeDirection) {
  return directions.some((direction) => direction.id === next.id)
    ? directions.map((direction) => (direction.id === next.id ? next : direction))
    : [...directions, next]
}

function upsertTemplate(templates: PromptTemplate[], next: PromptTemplate) {
  return templates.some((template) => template.id === next.id)
    ? templates.map((template) => (template.id === next.id ? next : template))
    : [...templates, next]
}
