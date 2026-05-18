import { useCallback, useEffect, useState, type ReactNode } from 'react'
import logo from '../assets/agorase-logo.jpeg'
import { fashionOsModules, type FashionOsModule } from '../fashionOs'
import { categories, pipelineStatuses, type Category, type PipelineStatus } from '../types'

type Section = FashionOsModule['section']

const DESKTOP_QUERY = '(min-width: 981px)'

export function AppShell({
  activeSection,
  activeModule,
  openTasks,
  query,
  categoryFilter,
  statusFilter,
  alert,
  filtersVisible,
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
  filtersVisible: boolean
  onSectionChange: (section: Section) => void
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const handleSectionChange = useCallback(
    (section: Section) => {
      onSectionChange(section)
      setDrawerOpen(false)
    },
    [onSectionChange],
  )

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setDrawerOpen(false)
    }
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    return undefined
  }, [])

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button
          type="button"
          className="drawer-trigger"
          aria-label={drawerOpen ? 'Navigation schließen' : 'Navigation öffnen'}
          aria-expanded={drawerOpen}
          aria-controls="primary-navigation"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="mobile-header-brand">
          <strong>AGORASE</strong>
          <span>Fashion OS</span>
        </div>
      </header>
      <Sidebar
        activeSection={activeSection}
        onSelect={handleSectionChange}
        metrics={openTasks}
        drawerOpen={drawerOpen}
        onCloseDrawer={closeDrawer}
      />
      {drawerOpen && (
        <div
          className="drawer-backdrop"
          aria-hidden="true"
          onClick={closeDrawer}
        />
      )}
      <main className="workspace">
        <Topbar
          activeModule={activeModule}
          query={query}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          filtersVisible={filtersVisible}
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
  drawerOpen,
  onCloseDrawer,
}: {
  activeSection: Section
  metrics: number
  onSelect: (section: Section) => void
  drawerOpen: boolean
  onCloseDrawer: () => void
}) {
  return (
    <aside className="sidebar" data-drawer-open={drawerOpen ? 'true' : 'false'}>
      <div className="brand-block">
        <img src={logo} alt="Agorase Logo" />
        <div>
          <strong>AGORASE</strong>
          <span>Fashion OS</span>
        </div>
        <button
          type="button"
          className="drawer-close"
          aria-label="Navigation schließen"
          onClick={onCloseDrawer}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <nav id="primary-navigation" className="side-nav" aria-label="Fashion OS Bereiche">
        {fashionOsModules.map((module) => (
          <button
            key={module.section}
            className={activeSection === module.section ? 'active' : ''}
            type="button"
            aria-current={activeSection === module.section ? 'page' : undefined}
            onClick={() => onSelect(module.section)}
          >
            <span>{module.shortLabel}</span>
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
  filtersVisible,
  onQueryChange,
  onCategoryChange,
  onStatusChange,
  onAdd,
}: {
  activeModule: FashionOsModule
  query: string
  categoryFilter: 'Alle' | Category
  statusFilter: 'Alle' | PipelineStatus
  filtersVisible: boolean
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
}) {
  return (
    <header className={filtersVisible ? 'topbar' : 'topbar topbar--solo'}>
      <div>
        <span className="label">Fashion OS / {activeModule.label}</span>
        <h1>{activeModule.label}</h1>
        <p className="topbar-summary">{activeModule.summary}</p>
      </div>
      {filtersVisible && (
        <div className="topbar-actions">
          <label className="topbar-field">
            <span className="field-label">Suche</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Suche nach Name, Kategorie, Stadt, Quelle"
            />
          </label>
          <label className="topbar-field">
            <span className="field-label">Kategorie</span>
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryChange(event.target.value as 'Alle' | Category)}
            >
              <option>Alle</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="topbar-field">
            <span className="field-label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value as 'Alle' | PipelineStatus)}
            >
              <option>Alle</option>
              {pipelineStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <button type="button" className="primary-button" onClick={onAdd}>
            Neuer Kontakt
          </button>
        </div>
      )}
    </header>
  )
}
