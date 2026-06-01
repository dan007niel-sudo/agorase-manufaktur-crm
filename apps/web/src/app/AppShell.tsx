import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import logo from '../assets/agorase-logo.jpeg'
import { fashionOsModules, type FashionOsModule, type FashionOsSection } from '../fashionOs'
import { categories, pipelineStatuses, type Category, type PipelineStatus } from '../types'

const DESKTOP_QUERY = '(min-width: 981px)'

export function AppShell({
  activeSection,
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
  onLogout,
  children,
}: {
  activeSection: FashionOsSection
  openTasks: number
  query: string
  categoryFilter: 'Alle' | Category
  statusFilter: 'Alle' | PipelineStatus
  alert?: string
  filtersVisible: boolean
  onSectionChange: (section: FashionOsSection) => void
  onQueryChange: (value: string) => void
  onCategoryChange: (value: 'Alle' | Category) => void
  onStatusChange: (value: 'Alle' | PipelineStatus) => void
  onAdd: () => void
  onLogout: () => void | Promise<void>
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const handleSectionChange = useCallback(
    (section: FashionOsSection) => {
      onSectionChange(section)
      setDrawerOpen(false)
    },
    [onSectionChange],
  )

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
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

  const activeModule =
    fashionOsModules.find((module) => module.section === activeSection) ?? fashionOsModules[0]

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
          <span>Manufaktur CRM</span>
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
          onLogout={onLogout}
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
  activeSection: FashionOsSection
  metrics: number
  onSelect: (section: FashionOsSection) => void
  drawerOpen: boolean
  onCloseDrawer: () => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') {
      return
    }
    event.preventDefault()
    const currentIndex = fashionOsModules.findIndex((module) => module.section === activeSection)
    if (currentIndex < 0) return
    let nextIndex = currentIndex
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % fashionOsModules.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + fashionOsModules.length) % fashionOsModules.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = fashionOsModules.length - 1
    onSelect(fashionOsModules[nextIndex].section)
  }

  return (
    <aside className="sidebar" data-drawer-open={drawerOpen ? 'true' : 'false'}>
      <div className="brand-block">
        <img src={logo} alt="Agorase Logo" />
        <div>
          <strong>AGORASE</strong>
          <span>Manufaktur CRM</span>
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
      <nav
        id="primary-navigation"
        className="side-nav"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Fashion OS Bereiche"
      >
        {fashionOsModules.map((module) => {
          const selected = activeSection === module.section
          const panelId = `tabpanel-${module.section.toLowerCase()}`
          const tabId = `tab-${module.section.toLowerCase()}`
          return (
            <button
              key={module.section}
              id={tabId}
              className={selected ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              aria-current={selected ? 'page' : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(module.section)}
              onKeyDown={handleKeyDown}
            >
              <span>{module.shortLabel}</span>
            </button>
          )
        })}
      </nav>
      <div className="today-label">
        <span>Heute</span>
        <strong>{metrics}</strong>
        <small>offene Schritte</small>
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
  onLogout,
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
  onLogout: () => void | Promise<void>
}) {
  return (
    <header className={filtersVisible ? 'topbar' : 'topbar topbar--solo'}>
      <div>
        <span className="label">Agorase Manufaktur CRM / {activeModule.label}</span>
        <h1>{activeModule.label}</h1>
        <p className="topbar-summary">{activeModule.summary}</p>
      </div>
      <div className="topbar-actions">
        {filtersVisible && (
          <>
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
          </>
        )}
        <button
          type="button"
          className="logout-button"
          aria-label="Abmelden"
          title="Abmelden"
          onClick={() => void onLogout()}
        >
          <LogOutIcon />
        </button>
      </div>
    </header>
  )
}

function LogOutIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
