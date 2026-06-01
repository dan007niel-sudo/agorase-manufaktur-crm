import { describe, expect, it } from 'vitest'
import { isTopbarFilterSection, selectVisibleRecord } from './appState'
import type { Manufactory } from '../types'

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

describe('appState helpers', () => {
  it('falls back to the first visible record when the selected id is filtered out', () => {
    const visibleRecords: Manufactory[] = [
      { ...baseRecord, id: 'grain-cut-studio', name: 'Grain Cut Studio' },
      { ...baseRecord, id: 'denim-yard', name: 'Denim Yard' },
    ]

    expect(selectVisibleRecord(visibleRecords, 'atelier-nordwear')?.id).toBe('grain-cut-studio')
  })

  it('keeps the selected record when it is still visible', () => {
    const visibleRecords: Manufactory[] = [
      { ...baseRecord, id: 'grain-cut-studio', name: 'Grain Cut Studio' },
      { ...baseRecord, id: 'denim-yard', name: 'Denim Yard' },
    ]

    expect(selectVisibleRecord(visibleRecords, 'denim-yard')?.id).toBe('denim-yard')
  })

  it('shows topbar filters only in the partners section', () => {
    expect(isTopbarFilterSection('Partners')).toBe(true)
    expect(isTopbarFilterSection('MockupStudio')).toBe(false)
    expect(isTopbarFilterSection('CreativeLab')).toBe(false)
    expect(isTopbarFilterSection('ManufakturScout')).toBe(false)
  })
})
