// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    cleanup()
  })

  it('renders navigation, topbar filters, alert, and children', () => {
    const onSelect = vi.fn()
    const onQueryChange = vi.fn()
    const onCategoryChange = vi.fn()
    const onStatusChange = vi.fn()
    const onAdd = vi.fn()
    const onLogout = vi.fn()

    const { container, getByText, getByPlaceholderText } = render(
      <AppShell
        activeSection="Partners"
        openTasks={3}
        query="atelier"
        categoryFilter="Alle"
        statusFilter="Alle"
        filtersVisible
        onSectionChange={onSelect}
        onQueryChange={onQueryChange}
        onCategoryChange={onCategoryChange}
        onStatusChange={onStatusChange}
        onAdd={onAdd}
        onLogout={onLogout}
        alert="Partnerdaten konnten nicht synchronisiert werden."
      >
        <section>Partner content</section>
      </AppShell>,
    )

    expect(container.querySelector('.app-shell')).toBeTruthy()
    expect(getByText('Partnerdaten konnten nicht synchronisiert werden.')).toBeTruthy()
    expect(getByText('Partner content')).toBeTruthy()
    expect(getByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeTruthy()
    expect(getByText('Kategorie')).toBeTruthy()
    expect(getByText('Status')).toBeTruthy()

    fireEvent.click(getByText('Sourcing'))
    fireEvent.click(getByText('Neuer Kontakt'))

    expect(onSelect).toHaveBeenCalledWith('Sourcing')
    expect(onAdd).toHaveBeenCalled()
  })

  it('marks the active tab with aria-selected', () => {
    const noop = vi.fn()
    const { container } = render(
      <AppShell
        activeSection="Mockups"
        openTasks={0}
        query=""
        categoryFilter="Alle"
        statusFilter="Alle"
        filtersVisible={false}
        onSectionChange={noop}
        onQueryChange={noop}
        onCategoryChange={noop}
        onStatusChange={noop}
        onAdd={noop}
        onLogout={noop}
      >
        <section>Mockups content</section>
      </AppShell>,
    )

    const tablist = container.querySelector('[role="tablist"]') as HTMLElement
    expect(tablist).toBeTruthy()
    const tabs = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(tabs.length).toBe(3)
    const selected = Array.from(tabs).find((tab) => tab.getAttribute('aria-selected') === 'true')
    expect(selected?.textContent).toBe('Mockups')
  })

  it('hides the filter actions when filtersVisible is false but keeps logout', () => {
    const noop = vi.fn()
    const { queryByPlaceholderText, queryByText, getByRole } = render(
      <AppShell
        activeSection="Mockups"
        openTasks={0}
        query=""
        categoryFilter="Alle"
        statusFilter="Alle"
        filtersVisible={false}
        onSectionChange={noop}
        onQueryChange={noop}
        onCategoryChange={noop}
        onStatusChange={noop}
        onAdd={noop}
        onLogout={noop}
      >
        <section>Mockups content</section>
      </AppShell>,
    )

    expect(queryByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeNull()
    expect(queryByText('Neuer Kontakt')).toBeNull()
    expect(getByRole('button', { name: 'Abmelden' })).toBeTruthy()
  })

  it('calls onLogout when the logout button is clicked', () => {
    const onLogout = vi.fn()
    const noop = vi.fn()
    const { getByRole } = render(
      <AppShell
        activeSection="Sourcing"
        openTasks={0}
        query=""
        categoryFilter="Alle"
        statusFilter="Alle"
        filtersVisible={false}
        onSectionChange={noop}
        onQueryChange={noop}
        onCategoryChange={noop}
        onStatusChange={noop}
        onAdd={noop}
        onLogout={onLogout}
      >
        <section>content</section>
      </AppShell>,
    )

    fireEvent.click(getByRole('button', { name: 'Abmelden' }))
    expect(onLogout).toHaveBeenCalled()
  })

  function renderShell(onSelect = vi.fn()) {
    const noop = vi.fn()
    return render(
      <AppShell
        activeSection="Partners"
        openTasks={1}
        query=""
        categoryFilter="Alle"
        statusFilter="Alle"
        filtersVisible
        onSectionChange={onSelect}
        onQueryChange={noop}
        onCategoryChange={noop}
        onStatusChange={noop}
        onAdd={noop}
        onLogout={noop}
      >
        <section>Partner content</section>
      </AppShell>,
    )
  }

  it('drawer is closed by default', () => {
    const { container } = renderShell()
    const trigger = container.querySelector('.drawer-trigger') as HTMLButtonElement
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    expect(trigger).toBeTruthy()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(sidebar.getAttribute('data-drawer-open')).toBe('false')
    expect(container.querySelector('.drawer-backdrop')).toBeNull()
  })

  it('opens the drawer when the hamburger button is clicked', () => {
    const { container } = renderShell()
    const trigger = container.querySelector('.drawer-trigger') as HTMLButtonElement
    fireEvent.click(trigger)
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(sidebar.getAttribute('data-drawer-open')).toBe('true')
    expect(container.querySelector('.drawer-backdrop')).toBeTruthy()
  })

  it('closes the drawer when Escape is pressed', () => {
    const { container } = renderShell()
    const trigger = container.querySelector('.drawer-trigger') as HTMLButtonElement
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(sidebar.getAttribute('data-drawer-open')).toBe('false')
  })

  it('closes the drawer after a section is selected', () => {
    const onSelect = vi.fn()
    const { container, getByText } = renderShell(onSelect)
    const trigger = container.querySelector('.drawer-trigger') as HTMLButtonElement
    fireEvent.click(trigger)
    fireEvent.click(getByText('Sourcing'))
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    expect(onSelect).toHaveBeenCalledWith('Sourcing')
    expect(sidebar.getAttribute('data-drawer-open')).toBe('false')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the drawer when the backdrop is clicked', () => {
    const { container } = renderShell()
    const trigger = container.querySelector('.drawer-trigger') as HTMLButtonElement
    fireEvent.click(trigger)
    const backdrop = container.querySelector('.drawer-backdrop') as HTMLElement
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop)
    const sidebar = container.querySelector('.sidebar') as HTMLElement
    expect(sidebar.getAttribute('data-drawer-open')).toBe('false')
  })
})
