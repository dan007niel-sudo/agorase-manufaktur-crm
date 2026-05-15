// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fashionOsModules } from '../fashionOs'
import { AppShell } from './AppShell'

describe('AppShell', () => {
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

    fireEvent.click(getByText('Sourcing'))
    fireEvent.click(getByText('Neuer Kontakt'))

    expect(onSelect).toHaveBeenCalledWith('Sourcing')
    expect(onAdd).toHaveBeenCalled()
  })
})
