// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('./api/tasksApi', () => ({
  listTasks: vi.fn(async () => []),
  saveTask: vi.fn(async (task) => task),
}))

vi.mock('./api/productionApi', () => ({
  listProductionProfiles: vi.fn(async () => []),
}))

vi.mock('./api/releasesApi', () => ({
  listReleases: vi.fn(async () => []),
  listReleaseTasks: vi.fn(async () => []),
}))

vi.mock('./api/webOpsApi', () => ({
  listWebOpsItems: vi.fn(async () => []),
}))

vi.mock('./api/creativeApi', () => ({
  listCreativeBriefs: vi.fn(async () => []),
  listCreativeDirections: vi.fn(async () => []),
}))

vi.mock('./api/mockupsApi', () => ({
  listMockupJobs: vi.fn(async () => []),
}))

vi.mock('./api/legalApi', () => ({
  listLegalNotes: vi.fn(async () => []),
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

  it('keeps Command Center free of topbar filters', () => {
    render(<App />)

    expect(screen.queryByPlaceholderText('Suche nach Name, Kategorie, Stadt, Quelle')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Neuer Kontakt' })).toBeNull()
  })

  it('closes an open contact modal after navigating to another section', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Partners' }))
    fireEvent.click(screen.getByRole('button', { name: 'Neuer Kontakt' }))
    expect(screen.getByText(/Fashion-Kontakt/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sourcing' }))

    expect(screen.queryByText(/Fashion-Kontakt/)).toBeNull()
  })
})
