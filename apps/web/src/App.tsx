import { useMemo, useState } from 'react'
import logo from './assets/agorase-logo.jpeg'
import './App.css'
import { seedManufactories, seedTemplates } from './data'
import {
  calculateMetrics,
  createEmptyManufacture,
  deriveTasks,
  groupByStatus,
  parseBulkImport,
  upsertManufacture,
} from './crmUtils'
import {
  categories,
  pipelineStatuses,
  type Category,
  type CrmTask,
  type Manufactory,
  type PipelineStatus,
  type Template,
} from './types'
import {
  requestAiManufactories,
  suggestionToManufacture,
  type AiResearchCriteria,
  type AiResearchSuggestion,
} from './aiResearch'

const sections = [
  'Dashboard',
  'Fashion-Liste',
  'Pipeline',
  'Kontakte',
  'Follow-ups',
  'Aufgaben',
  'Kategorien',
  'Potenzial',
  'KI-Recherche',
  'Vorlagen',
  'Bulk-Import',
] as const

type Section = (typeof sections)[number]

const storageKeys = {
  records: 'agorase.records',
  templates: 'agorase.templates',
  completedTasks: 'agorase.completedTasks',
  apiKey: 'agorase.openaiApiKey',
}

function App() {
  if (window.location.search.includes('reset=1')) {
    Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key))
    window.history.replaceState({}, '', window.location.pathname)
  }

  const [activeSection, setActiveSection] = useState<Section>('Dashboard')
  const [records, setRecords] = useLocalState<Manufactory[]>(storageKeys.records, seedManufactories)
  const [templates, setTemplates] = useLocalState<Template[]>(storageKeys.templates, seedTemplates)
  const [completedTasks, setCompletedTasks] = useLocalState<string[]>(storageKeys.completedTasks, [])
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Alle' | Category>('Alle')
  const [statusFilter, setStatusFilter] = useState<'Alle' | PipelineStatus>('Alle')
  const [formOpen, setFormOpen] = useState(false)

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0]
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.name,
          record.contactPerson,
          record.category,
          record.city,
          record.region,
          record.country,
          record.source,
          record.products,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesCategory = categoryFilter === 'Alle' || record.category === categoryFilter
      const matchesStatus = statusFilter === 'Alle' || record.status === statusFilter
      return matchesQuery && matchesCategory && matchesStatus
    })
  }, [records, query, categoryFilter, statusFilter])

  const today = '2026-05-14'
  const metrics = calculateMetrics(records, today)
  const tasks = deriveTasks(records, today).map((task) => ({
    ...task,
    completed: completedTasks.includes(task.id),
  }))

  function saveRecord(nextRecord: Manufactory) {
    setRecords((current) => upsertManufacture(current, nextRecord))
    setSelectedId(nextRecord.id)
    setFormOpen(false)
  }

  function updateSelectedRecord(patch: Partial<Manufactory>) {
    if (!selectedRecord) return
    saveRecord({ ...selectedRecord, ...patch })
  }

  function toggleTask(task: CrmTask) {
    setCompletedTasks((current) =>
      current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
    )
  }

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} metrics={metrics.openTasks} />
      <main className="workspace">
        <Topbar
          query={query}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          onQueryChange={setQuery}
          onCategoryChange={setCategoryFilter}
          onStatusChange={setStatusFilter}
          onAdd={() => {
            setSelectedId('')
            setFormOpen(true)
          }}
        />
        {activeSection === 'Dashboard' && (
          <Dashboard
            metrics={metrics}
            records={records}
            tasks={tasks}
            onSelectRecord={setSelectedId}
            onSectionChange={setActiveSection}
          />
        )}
        {activeSection === 'Fashion-Liste' && (
          <ListView
            records={filteredRecords}
            selectedRecord={selectedRecord}
            onSelect={setSelectedId}
            onEdit={() => setFormOpen(true)}
            onPatch={updateSelectedRecord}
          />
        )}
        {activeSection === 'Pipeline' && (
          <PipelineView records={filteredRecords} onSelect={setSelectedId} onPatch={saveRecord} />
        )}
        {activeSection === 'Kontakte' && <ContactsView records={filteredRecords} onSelect={setSelectedId} />}
        {activeSection === 'Follow-ups' && (
          <FollowUpsView records={records} onSelect={setSelectedId} onPatch={saveRecord} today={today} />
        )}
        {activeSection === 'Aufgaben' && (
          <TasksView tasks={tasks} records={records} onToggle={toggleTask} onSelectRecord={setSelectedId} />
        )}
        {activeSection === 'Kategorien' && <CategoriesView records={records} />}
        {activeSection === 'Potenzial' && <PotentialView records={records} />}
        {activeSection === 'KI-Recherche' && (
          <AiResearchView
            onImport={(newRecords) => {
              setRecords((current) => [...current, ...newRecords])
              if (newRecords[0]) setSelectedId(newRecords[0].id)
              setQuery('')
              setCategoryFilter('Alle')
              setStatusFilter('Alle')
              setActiveSection('Fashion-Liste')
            }}
          />
        )}
        {activeSection === 'Vorlagen' && <TemplatesView templates={templates} onChange={setTemplates} />}
        {activeSection === 'Bulk-Import' && (
          <BulkImportView
            onImport={(newRecords) => {
              setRecords((current) => [...current, ...newRecords])
              if (newRecords[0]) setSelectedId(newRecords[0].id)
              setQuery('')
              setCategoryFilter('Alle')
              setStatusFilter('Alle')
              setActiveSection('Fashion-Liste')
            }}
          />
        )}
      </main>
      {formOpen && (
        <RecordForm
          initialRecord={selectedId ? selectedRecord : createEmptyManufacture()}
          onCancel={() => setFormOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  )
}

function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  })

  function updateValue(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      return resolved
    })
  }

  return [value, updateValue] as const
}

function Sidebar({
  activeSection,
  metrics,
  onSelect,
}: {
  activeSection: Section
  metrics: number
  onSelect: (section: Section) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img src={logo} alt="Agorase Logo" />
        <div>
          <strong>AGORASE</strong>
          <span>Fashion CRM</span>
        </div>
      </div>
      <nav className="side-nav" aria-label="CRM Bereiche">
        {sections.map((section) => (
          <button
            key={section}
            className={activeSection === section ? 'active' : ''}
            type="button"
            onClick={() => onSelect(section)}
          >
            {section}
          </button>
        ))}
      </nav>
      <div className="today-label">
        <span>Heute</span>
        <strong>{metrics}</strong>
        <small>offene CRM-Schritte</small>
      </div>
    </aside>
  )
}

function Topbar({
  query,
  categoryFilter,
  statusFilter,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onAdd,
}: {
  query: string
  categoryFilter: 'Alle' | Category
  statusFilter: 'Alle' | PipelineStatus
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
}) {
  return (
    <header className="topbar">
      <div>
        <span className="label">Fashion Sourcing</span>
        <h1>Labels, Ateliers und Produktionspartner kuratieren.</h1>
      </div>
      <div className="topbar-actions">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Suche nach Name, Kategorie, Stadt, Quelle"
        />
        <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value as 'Alle' | Category)}>
          <option>Alle</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value as 'Alle' | PipelineStatus)}>
          <option>Alle</option>
          {pipelineStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="button" className="primary-button" onClick={onAdd}>
          Neuer Kontakt
        </button>
      </div>
    </header>
  )
}

function Dashboard({
  metrics,
  records,
  tasks,
  onSelectRecord,
  onSectionChange,
}: {
  metrics: ReturnType<typeof calculateMetrics>
  records: Manufactory[]
  tasks: CrmTask[]
  onSelectRecord: (id: string) => void
  onSectionChange: (section: Section) => void
}) {
  const topRecords = records.filter((record) => record.priority === 'A' || record.brandFit === 'A').slice(0, 4)

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric label="Gesamt" value={metrics.total} />
        <Metric label="Markenfit A" value={metrics.highFit} />
        <Metric label="Potenzial hoch" value={metrics.highPotential} />
        <Metric label="Heute dran" value={metrics.dueFollowUps} dark />
      </div>
      <div className="panel wide">
        <PanelHeader title="Priorisierte Fashion-Partner" action="Zur Liste" onClick={() => onSectionChange('Fashion-Liste')} />
        <CompactTable records={topRecords} onSelect={onSelectRecord} />
      </div>
      <div className="panel">
        <PanelHeader title="Nächste Schritte" action="Aufgaben" onClick={() => onSectionChange('Aufgaben')} />
        <TaskList tasks={tasks.slice(0, 5)} records={records} onSelectRecord={onSelectRecord} />
      </div>
    </section>
  )
}

function Metric({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={`metric ${dark ? 'dark' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PanelHeader({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  )
}

function ListView({
  records,
  selectedRecord,
  onSelect,
  onEdit,
  onPatch,
}: {
  records: Manufactory[]
  selectedRecord?: Manufactory
  onSelect: (id: string) => void
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
}) {
  return (
    <section className="split-view">
      <div className="panel table-panel">
        <PanelHeader title="Fashion-Partner-Liste" />
        <CompactTable records={records} onSelect={onSelect} selectedId={selectedRecord?.id} />
      </div>
      {selectedRecord && <DetailPanel record={selectedRecord} onEdit={onEdit} onPatch={onPatch} />}
    </section>
  )
}

function CompactTable({
  records,
  onSelect,
  selectedId,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  selectedId?: string
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Label / Atelier</th>
            <th>Kategorie</th>
            <th>Status</th>
            <th>Fit</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className={selectedId === record.id ? 'selected' : ''} onClick={() => onSelect(record.id)}>
              <td>
                <strong>{record.name}</strong>
                <small>{[record.city, record.country].filter(Boolean).join(', ')}</small>
              </td>
              <td>{record.category}</td>
              <td>
                <span className="chip">{record.status}</span>
              </td>
              <td>{record.brandFit}</td>
              <td>{record.nextFollowUp || 'offen'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailPanel({
  record,
  onEdit,
  onPatch,
}: {
  record: Manufactory
  onEdit: () => void
  onPatch: (patch: Partial<Manufactory>) => void
}) {
  return (
    <aside className="detail-panel">
      <span className="label">Selected</span>
      <h2>{record.name}</h2>
      <p>{record.products}</p>
      <div className="detail-lines">
        <span>Status: {record.status}</span>
        <span>Potenzial: {record.cooperationPotential}</span>
        <span>Prioritaet: {record.priority}</span>
        <span>Quelle: {record.source || 'offen'}</span>
      </div>
      <label>
        Status
        <select value={record.status} onChange={(event) => onPatch({ status: event.target.value as PipelineStatus })}>
          {pipelineStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Naechster Follow-up
        <input type="date" value={record.nextFollowUp} onChange={(event) => onPatch({ nextFollowUp: event.target.value })} />
      </label>
      <label>
        Naechster Schritt
        <input value={record.nextStep} onChange={(event) => onPatch({ nextStep: event.target.value })} />
      </label>
      <div className="note-box">{record.notes || 'Noch keine Notizen.'}</div>
      <button type="button" onClick={onEdit}>
        Datensatz bearbeiten
      </button>
    </aside>
  )
}

function PipelineView({
  records,
  onSelect,
  onPatch,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
}) {
  return (
    <section className="pipeline-board">
      {groupByStatus(records)
        .filter((group) => group.records.length > 0)
        .map((group) => (
          <div className="pipeline-column" key={group.status}>
            <div className="column-title">
              <strong>{group.status}</strong>
              <span>{group.records.length}</span>
            </div>
            {group.records.map((record) => (
              <article className="pipeline-card" key={record.id} onClick={() => onSelect(record.id)}>
                <strong>{record.name}</strong>
                <span>{record.category}</span>
                <small>{record.nextStep || 'Nächsten Schritt festlegen'}</small>
                <select
                  value={record.status}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onPatch({ ...record, status: event.target.value as PipelineStatus })}
                >
                  {pipelineStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        ))}
    </section>
  )
}

function ContactsView({ records, onSelect }: { records: Manufactory[]; onSelect: (id: string) => void }) {
  return (
    <section className="panel">
      <PanelHeader title="Kontakte" />
      <div className="contact-grid">
        {records.map((record) => (
          <article className="contact-card" key={record.id} onClick={() => onSelect(record.id)}>
            <strong>{record.name}</strong>
            <span>{record.contactPerson || 'Ansprechpartner offen'}</span>
            <a href={record.website} target="_blank">
              Website
            </a>
            <a href={`mailto:${record.email}`}>{record.email || 'E-Mail fehlt'}</a>
            <span>{record.phone || 'Telefon fehlt'}</span>
            <span>{record.social || 'Social fehlt'}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

function FollowUpsView({
  records,
  onSelect,
  onPatch,
  today,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
  today: string
}) {
  const sorted = [...records].filter((record) => record.nextFollowUp).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))

  return (
    <section className="panel">
      <PanelHeader title="Follow-ups" />
      <div className="follow-list">
        {sorted.map((record) => (
          <article className={record.nextFollowUp <= today ? 'follow-row due' : 'follow-row'} key={record.id}>
            <button type="button" onClick={() => onSelect(record.id)}>
              {record.name}
            </button>
            <span>{record.nextStep}</span>
            <input type="date" value={record.nextFollowUp} onChange={(event) => onPatch({ ...record, nextFollowUp: event.target.value })} />
          </article>
        ))}
      </div>
    </section>
  )
}

function TasksView({
  tasks,
  records,
  onToggle,
  onSelectRecord,
}: {
  tasks: CrmTask[]
  records: Manufactory[]
  onToggle: (task: CrmTask) => void
  onSelectRecord: (id: string) => void
}) {
  return (
    <section className="panel">
      <PanelHeader title="Aufgaben" />
      <TaskList tasks={tasks} records={records} onToggle={onToggle} onSelectRecord={onSelectRecord} />
    </section>
  )
}

function TaskList({
  tasks,
  records,
  onToggle,
  onSelectRecord,
}: {
  tasks: CrmTask[]
  records: Manufactory[]
  onToggle?: (task: CrmTask) => void
  onSelectRecord: (id: string) => void
}) {
  return (
    <div className="task-list">
      {tasks.map((task) => {
        const record = records.find((item) => item.id === task.manufactureId)
        return (
          <article className={`task-row ${task.urgency} ${task.completed ? 'done' : ''}`} key={task.id}>
            {onToggle && <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />}
            <button type="button" onClick={() => onSelectRecord(task.manufactureId)}>
              {task.title}
            </button>
          <span>{record?.name}</span>
            <small>{task.dueDate || 'ohne Datum'}</small>
          </article>
        )
      })}
    </div>
  )
}

function CategoriesView({ records }: { records: Manufactory[] }) {
  return (
    <section className="panel">
      <PanelHeader title="Kategorien" />
      <div className="category-grid">
        {categories.map((category) => {
          const categoryRecords = records.filter((record) => record.category === category)
          const highPotential = categoryRecords.filter((record) => record.cooperationPotential === 'Hoch').length
          return (
            <article className="category-card" key={category}>
              <strong>{category}</strong>
              <span>{categoryRecords.length} Kontakte</span>
              <small>{highPotential} mit hohem Potenzial</small>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PotentialView({ records }: { records: Manufactory[] }) {
  const buckets = ['Hoch', 'Mittel', 'Niedrig'] as const
  return (
    <section className="panel">
      <PanelHeader title="Umsatz- und Potenzialbereich" />
      <div className="bar-list">
        {buckets.map((bucket) => {
          const count = records.filter((record) => record.cooperationPotential === bucket).length
          const width = records.length ? `${Math.round((count / records.length) * 100)}%` : '0%'
          return (
            <div className="bar-row" key={bucket}>
              <span>{bucket}</span>
              <div>
                <i style={{ width }} />
              </div>
              <strong>{count}</strong>
            </div>
          )
        })}
      </div>
      <CompactTable records={records.filter((record) => record.cooperationPotential === 'Hoch')} onSelect={() => undefined} />
    </section>
  )
}

function AiResearchView({ onImport }: { onImport: (records: Manufactory[]) => void }) {
  const [apiKey, setApiKey] = useLocalState(storageKeys.apiKey, '')
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
    if (!apiKey.trim()) {
      setError('Bitte zuerst einen OpenAI API Key eintragen.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const nextSuggestions = await requestAiManufactories({ apiKey: apiKey.trim(), criteria })
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
          Lass dir passende Labels, Ateliers, Hersteller und Fashion-Partner per KI-Websuche vorschlagen und übernimm die besten Treffer direkt in die CRM-Liste.
        </p>
        <label>
          OpenAI API Key
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>
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
            onClick={() => onImport(selectedSuggestions.map(suggestionToManufacture))}
          >
            {selectedSuggestions.length} Vorschläge ins CRM übernehmen
          </button>
        )}
      </div>
    </section>
  )
}

function TemplatesView({ templates, onChange }: { templates: Template[]; onChange: (templates: Template[]) => void }) {
  function updateTemplate(id: string, patch: Partial<Template>) {
    onChange(templates.map((template) => (template.id === id ? { ...template, ...patch } : template)))
  }

  return (
    <section className="template-grid">
      {templates.map((template) => (
        <article className="panel template-card" key={template.id}>
          <input value={template.name} onChange={(event) => updateTemplate(template.id, { name: event.target.value })} />
          <input value={template.subject} onChange={(event) => updateTemplate(template.id, { subject: event.target.value })} />
          <textarea value={template.body} onChange={(event) => updateTemplate(template.id, { body: event.target.value })} />
        </article>
      ))}
    </section>
  )
}

function BulkImportView({ onImport }: { onImport: (records: Manufactory[]) => void }) {
  const [raw, setRaw] = useState('Name\tKategorie\tStadt\tE-Mail\tStatus\tPriorität\nNeue Werkstatt\tKeramik\tBerlin\thello@example.com\tKontakt gefunden\tA')
  const preview = useMemo(() => parseBulkImport(raw), [raw])

  return (
    <section className="split-view">
      <div className="panel">
        <PanelHeader title="Bulk-Import" />
        <textarea className="import-box" value={raw} onChange={(event) => setRaw(event.target.value)} />
        <button type="button" className="primary-button" onClick={() => onImport(preview)} disabled={!preview.length}>
          {preview.length} Zeilen importieren
        </button>
      </div>
      <div className="panel">
        <PanelHeader title="Vorschau" />
        <CompactTable records={preview} onSelect={() => undefined} />
      </div>
    </section>
  )
}

function RecordForm({
  initialRecord,
  onCancel,
  onSave,
}: {
  initialRecord: Manufactory
  onCancel: () => void
  onSave: (record: Manufactory) => void
}) {
  const [draft, setDraft] = useState(initialRecord)

  function patch(field: keyof Manufactory, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="modal-backdrop">
      <form
        className="record-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave({ ...draft, id: draft.id || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
        }}
      >
        <PanelHeader title={draft.id ? 'Fashion-Kontakt bearbeiten' : 'Neuer Fashion-Kontakt'} />
        <div className="form-grid">
          <Field label="Name" value={draft.name} onChange={(value) => patch('name', value)} />
          <Field label="Ansprechpartner" value={draft.contactPerson} onChange={(value) => patch('contactPerson', value)} />
          <label>
            Kategorie
            <select value={draft.category} onChange={(event) => patch('category', event.target.value)}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <Field label="Stadt" value={draft.city} onChange={(value) => patch('city', value)} />
          <Field label="Land" value={draft.country} onChange={(value) => patch('country', value)} />
          <Field label="Website" value={draft.website} onChange={(value) => patch('website', value)} />
          <Field label="E-Mail" value={draft.email} onChange={(value) => patch('email', value)} />
          <Field label="Telefon" value={draft.phone} onChange={(value) => patch('phone', value)} />
          <Field label="Social" value={draft.social} onChange={(value) => patch('social', value)} />
          <Field label="Produkte" value={draft.products} onChange={(value) => patch('products', value)} />
          <label>
            Status
            <select value={draft.status} onChange={(event) => patch('status', event.target.value)}>
              {pipelineStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <Field label="Nächster Schritt" value={draft.nextStep} onChange={(value) => patch('nextStep', value)} />
        </div>
        <label>
          Notizen
          <textarea value={draft.notes} onChange={(event) => patch('notes', event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="primary-button">
            Speichern
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default App
