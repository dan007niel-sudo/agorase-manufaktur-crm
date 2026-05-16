import { useEffect, useMemo, useState } from 'react'
import {
  WEB_OPS_KINDS,
  WEB_OPS_STATUSES,
  type FashionRelease,
  type WebOpsChecklistItem,
  type WebOpsItem,
  type WebOpsKind,
  type WebOpsStatus,
} from '@agorase/shared'
import {
  createWebOpsItem,
  deleteWebOpsItem,
  listWebOpsItems,
  updateWebOpsItem,
} from '../../api/webOpsApi'
import { listReleases } from '../../api/releasesApi'
import { PanelHeader } from '../../components/Panel'
import type { FashionOsModule } from '../../fashionOs'

type KindFilter = 'Alle' | WebOpsKind
type StatusFilter = 'Alle' | WebOpsStatus

export function WebOpsView({ module }: { module: FashionOsModule }) {
  const [items, setItems] = useState<WebOpsItem[]>([])
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('Alle')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Alle')
  const [releaseFilter, setReleaseFilter] = useState<'Alle' | string>('Alle')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesKind = kindFilter === 'Alle' || item.kind === kindFilter
      const matchesStatus = statusFilter === 'Alle' || item.status === statusFilter
      const matchesRelease =
        releaseFilter === 'Alle' ||
        (releaseFilter === '__none__' ? !item.releaseId : item.releaseId === releaseFilter)
      return matchesKind && matchesStatus && matchesRelease
    })
  }, [items, kindFilter, statusFilter, releaseFilter])

  const selectedItem = items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? items[0]

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [loadedItems, loadedReleases] = await Promise.all([listWebOpsItems(), listReleases()])
        if (!active) return
        setItems(loadedItems)
        setReleases(loadedReleases)
        setSelectedId((current) => current || loadedItems[0]?.id || '')
        setStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Web Ops konnten nicht geladen werden.')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function addItem() {
    const item = createEmptyWebOpsItem()
    try {
      const saved = await createWebOpsItem(item)
      setItems((current) => upsertItem(current, saved))
      setSelectedId(saved.id)
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Web Ops Eintrag konnte nicht erstellt werden.')
    }
  }

  async function patchItem(patch: Partial<WebOpsItem>) {
    if (!selectedItem) return
    try {
      const saved = await updateWebOpsItem(selectedItem.id, { ...selectedItem, ...patch })
      setItems((current) => upsertItem(current, saved))
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Web Ops Eintrag konnte nicht gespeichert werden.')
    }
  }

  async function removeItem() {
    if (!selectedItem) return
    if (!window.confirm(`Web Ops Eintrag "${selectedItem.title}" wirklich löschen?`)) return
    try {
      await deleteWebOpsItem(selectedItem.id)
      setItems((current) => current.filter((item) => item.id !== selectedItem.id))
      setSelectedId('')
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Web Ops Eintrag konnte nicht entfernt werden.')
    }
  }

  function toggleChecklistItem(checklistItemId: string) {
    if (!selectedItem) return
    const nextChecklist = selectedItem.checklist.map((entry) =>
      entry.id === checklistItemId ? { ...entry, done: !entry.done } : entry,
    )
    void patchItem({ checklist: nextChecklist })
  }

  function addChecklistEntry() {
    if (!selectedItem) return
    const entry: WebOpsChecklistItem = { id: `c-${Date.now()}`, label: 'Neuer Punkt', done: false }
    void patchItem({ checklist: [...selectedItem.checklist, entry] })
  }

  function updateChecklistLabel(checklistItemId: string, label: string) {
    if (!selectedItem) return
    const nextChecklist = selectedItem.checklist.map((entry) =>
      entry.id === checklistItemId ? { ...entry, label } : entry,
    )
    void patchItem({ checklist: nextChecklist })
  }

  function removeChecklistEntry(checklistItemId: string) {
    if (!selectedItem) return
    void patchItem({ checklist: selectedItem.checklist.filter((entry) => entry.id !== checklistItemId) })
  }

  return (
    <section className="web-ops-layout">
      <aside className="web-ops-list panel">
        <PanelHeader title="Web Ops" action="Neuer Eintrag" onClick={() => void addItem()} />
        <div className="web-ops-filters">
          <label>
            Kind
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as KindFilter)}>
              <option value="Alle">Alle</option>
              {WEB_OPS_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              <option value="Alle">Alle</option>
              {WEB_OPS_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Release
            <select value={releaseFilter} onChange={(event) => setReleaseFilter(event.target.value)}>
              <option value="Alle">Alle</option>
              <option value="__none__">Ohne Release</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!filteredItems.length && <div className="empty-state">Noch keine Web Ops Einträge.</div>}
        {filteredItems.map((item) => (
          <button
            className={item.id === selectedItem?.id ? 'web-ops-card selected' : 'web-ops-card'}
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
          >
            <strong>{item.title}</strong>
            <span>
              {item.kind} · {item.status}
            </span>
            <small>{item.dueDate || 'Kein Datum'}</small>
          </button>
        ))}
      </aside>

      <section className="web-ops-workspace panel">
        <PanelHeader title={module.label} />
        {status === 'error' && <div className="error-box">{error}</div>}
        {status === 'loading' && <div className="empty-state">Web Ops werden geladen.</div>}
        {!selectedItem && status !== 'loading' && (
          <div className="empty-state">Lege einen Web Ops Eintrag an, um Briefs und SEO zu verwalten.</div>
        )}
        {selectedItem && (
          <>
            <div className="web-ops-summary">
              <div>
                <span className="label">Status</span>
                <strong>{selectedItem.status}</strong>
              </div>
              <div>
                <span className="label">Kind</span>
                <strong>{selectedItem.kind}</strong>
              </div>
              <div>
                <span className="label">Offene Punkte</span>
                <strong>{selectedItem.checklist.filter((entry) => !entry.done).length}</strong>
              </div>
            </div>
            <div className="web-ops-detail-grid">
              <WebOpsEditor
                item={selectedItem}
                releases={releases}
                onChange={(patch) => void patchItem(patch)}
                onDelete={() => void removeItem()}
              />
              <WebOpsSeoEditor item={selectedItem} onChange={(patch) => void patchItem(patch)} />
              <WebOpsChecklist
                items={selectedItem.checklist}
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

function WebOpsEditor({
  item,
  releases,
  onChange,
  onDelete,
}: {
  item: WebOpsItem
  releases: FashionRelease[]
  onChange: (patch: Partial<WebOpsItem>) => void
  onDelete: () => void
}) {
  return (
    <div className="web-ops-panel">
      <div className="panel-header compact">
        <h3>Eintrag</h3>
        <button type="button" onClick={onDelete}>
          Entfernen
        </button>
      </div>
      <label>
        Titel
        <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Kind
          <select value={item.kind} onChange={(event) => onChange({ kind: event.target.value as WebOpsKind })}>
            {WEB_OPS_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={item.status} onChange={(event) => onChange({ status: event.target.value as WebOpsStatus })}>
            {WEB_OPS_STATUSES.map((value) => (
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
          <select value={item.releaseId} onChange={(event) => onChange({ releaseId: event.target.value })}>
            <option value="">Ohne Release</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fällig
          <input type="date" value={item.dueDate} onChange={(event) => onChange({ dueDate: event.target.value })} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Owner
          <input value={item.assignee} onChange={(event) => onChange({ assignee: event.target.value })} />
        </label>
        <label>
          Ziel-URL
          <input value={item.targetUrl} onChange={(event) => onChange({ targetUrl: event.target.value })} />
        </label>
      </div>
      <label>
        Summary
        <textarea value={item.summary} onChange={(event) => onChange({ summary: event.target.value })} />
      </label>
      <label>
        Body
        <textarea value={item.body} onChange={(event) => onChange({ body: event.target.value })} />
      </label>
      <label>
        Notizen
        <textarea value={item.notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
    </div>
  )
}

function WebOpsSeoEditor({ item, onChange }: { item: WebOpsItem; onChange: (patch: Partial<WebOpsItem>) => void }) {
  return (
    <div className="web-ops-panel">
      <h3>SEO</h3>
      <label>
        Title
        <input value={item.seoTitle} onChange={(event) => onChange({ seoTitle: event.target.value })} />
      </label>
      <label>
        Description
        <textarea
          value={item.seoDescription}
          onChange={(event) => onChange({ seoDescription: event.target.value })}
        />
      </label>
      <label>
        Keywords
        <input value={item.seoKeywords} onChange={(event) => onChange({ seoKeywords: event.target.value })} />
      </label>
    </div>
  )
}

function WebOpsChecklist({
  items,
  onAdd,
  onToggle,
  onLabelChange,
  onRemove,
}: {
  items: WebOpsChecklistItem[]
  onAdd: () => void
  onToggle: (id: string) => void
  onLabelChange: (id: string, label: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="web-ops-panel">
      <div className="panel-header compact">
        <h3>Checklist</h3>
        <button type="button" onClick={onAdd}>
          Neuer Punkt
        </button>
      </div>
      {!items.length && <div className="empty-state">Noch keine Punkte.</div>}
      {items.map((entry) => (
        <div className="web-ops-checklist-row" key={entry.id}>
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

function createEmptyWebOpsItem(): WebOpsItem {
  const now = new Date().toISOString()
  return {
    id: `web-ops-${Date.now()}`,
    releaseId: '',
    title: 'Neuer Web Ops Eintrag',
    kind: 'page-brief',
    status: 'idea',
    summary: '',
    body: '',
    targetUrl: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    checklist: [],
    assignee: '',
    dueDate: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function upsertItem(items: WebOpsItem[], next: WebOpsItem) {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [...items, next]
}
