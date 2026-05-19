import { describe, expect, it } from 'vitest'
import { formatLocalDate, selectVisibleRecord } from './appState'
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
  it('formats the current local date as an ISO calendar date', () => {
    expect(formatLocalDate(new Date(2026, 4, 19, 23, 30))).toBe('2026-05-19')
    expect(formatLocalDate(new Date(2026, 0, 5, 1, 2))).toBe('2026-01-05')
  })

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
})
