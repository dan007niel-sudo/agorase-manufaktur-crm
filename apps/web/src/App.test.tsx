// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Manufactory } from './types'

vi.mock('./app/authState', () => ({
  resetStoredStateFromQuery: vi.fn(),
  useAdminAuth: () => ({
    authStatus: 'authenticated',
    authError: '',
    handleLogin: vi.fn(),
    handleLogout: vi.fn(),
  }),
}))

vi.mock('./api/partnersApi', () => ({
  deletePartner: vi.fn(),
  importPartners: vi.fn(async (records: Manufactory[]) => records),
  listPartners: vi.fn(async () => [baseRecord]),
  savePartner: vi.fn(async (record: Manufactory) => record),
  updatePartner: vi.fn(async (_id: string, patch: Partial<Manufactory>) => ({ ...baseRecord, ...patch })),
}))

vi.mock('./api/mockupsApi', () => ({
  listMockupJobs: vi.fn(async () => []),
  deleteMockupJob: vi.fn(),
  downloadMockupJob: vi.fn(),
  generateMockup: vi.fn(),
}))

const baseRecord: Manufactory = {
  id: 'atelier-nordwear',
  name: 'Atelier Nordwear',
  contactPerson: '',
  category: 'Streetwear',
  city: 'Hamburg',
  region: 'Hamburg',
  country: 'Deutschland',
  website: '',
  email: '',
  phone: '',
  social: '',
  products: '',
  priceLevel: 'Premium',
  brandFit: 'A',
  cooperationPotential: 'Hoch',
  status: 'Antwort erhalten',
  priority: 'A',
  source: '',
  lastContact: '',
  nextFollowUp: '',
  nextStep: '',
  notes: '',
}

describe('App', () => {
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
    vi.clearAllMocks()
  })

  it('boots into the Sourcing tab', () => {
    render(<App />)

    const sourcingTab = screen.getByRole('tab', { name: 'Sourcing' })
    expect(sourcingTab.getAttribute('aria-selected')).toBe('true')
  })

  it('shows topbar filters on Sourcing and Partners, hides them on Mockups', async () => {
    render(<App />)

    // Sourcing tab (default): filters visible
    expect(screen.getByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Neuer Kontakt' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Mockups' }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeNull()
    })
    expect(screen.queryByRole('button', { name: 'Neuer Kontakt' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'Partners' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Neuer Kontakt' })).toBeTruthy()
  })

  it('closes an open contact modal after navigating to another section', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('tab', { name: 'Partners' }))
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Kontakt' }))
    expect(screen.getByText(/Fashion-Kontakt/)).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Sourcing' }))

    expect(screen.queryByText(/Fashion-Kontakt/)).toBeNull()
  })

  it('renders a logout button in the topbar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeTruthy()
  })
})
