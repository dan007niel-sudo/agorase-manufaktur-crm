import type { ReactNode } from 'react'
import logo from '../assets/agorase-logo.jpeg'
import { fashionOsModules, type FashionOsModule } from '../fashionOs'
import { categories, pipelineStatuses, type Category, type PipelineStatus } from '../types'

type Section = FashionOsModule['section']

export function AppShell({
  activeSection,
  activeModule,
  openTasks,
  query,
  categoryFilter,
  statusFilter,
  alert,
  onSectionChange,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onAdd,
  children,
}: {
  activeSection: Section
  activeModule: FashionOsModule
  openTasks: number
  query: string
  categoryFilter: 'Alle' | Category
  statusFilter: 'Alle' | PipelineStatus
  alert?: string
  onSectionChange: (section: Section) => void
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={onSectionChange} metrics={openTasks} />
      <main className="workspace">
        <Topbar
          activeModule={activeModule}
          query={query}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          onQueryChange={onQueryChange}
          onCategoryChange={onCategoryChange}
          onStatusChange={onStatusChange}
          onAdd={onAdd}
        />
        {alert && <div className="app-alert">{alert}</div>}
        {children}
      </main>
    </div>
  )
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
          <span>Fashion OS</span>
        </div>
      </div>
      <nav className="side-nav" aria-label="Fashion OS Bereiche">
        {fashionOsModules.map((module) => (
          <button
            key={module.section}
            className={activeSection === module.section ? 'active' : ''}
            type="button"
            onClick={() => onSelect(module.section)}
          >
            <span>{module.shortLabel}</span>
            <small>{module.status}</small>
          </button>
        ))}
      </nav>
      <div className="today-label">
        <span>Heute</span>
        <strong>{metrics}</strong>
        <small>offene OS-Schritte</small>
      </div>
    </aside>
  )
}

function Topbar({
  activeModule,
  query,
  categoryFilter,
  statusFilter,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onAdd,
}: {
  activeModule: FashionOsModule
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
        <span className="label">Fashion OS / {activeModule.status}</span>
        <h1>{activeModule.label}</h1>
        <p className="topbar-summary">{activeModule.summary}</p>
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
