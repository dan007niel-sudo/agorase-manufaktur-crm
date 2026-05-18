// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fashionOsModules } from '../fashionOs'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders navigation, topbar filters, alert, and children', () => {
    const onSelect = vi.fn()
    const onQueryChange = vi.fn()
    const onCategoryChange = vi.fn()
    const onStatusChange = vi.fn()
    const onAdd = vi.fn()

    const { container, getByText, getByPlaceholderText } = render(
      <AppShell
        activeSection="Partners"
        activeModule={fashionOsModules[2]}
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
        alert="Partnerdaten konnten nicht synchronisiert werden."
      >
        <section>Partner content</section>
      </AppShell>,
    )

    expect(container.querySelector('.app-shell')).toBeTruthy()
    expect(getByText('Fashion OS')).toBeTruthy()
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

  it('hides the filter actions when filtersVisible is false', () => {
    const noop = vi.fn()
    const { queryByPlaceholderText, queryByText } = render(
      <AppShell
        activeSection="Settings"
        activeModule={fashionOsModules[9]}
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
      >
        <section>Settings content</section>
      </AppShell>,
    )

    expect(queryByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeNull()
    expect(queryByText('Neuer Kontakt')).toBeNull()
  })
})
