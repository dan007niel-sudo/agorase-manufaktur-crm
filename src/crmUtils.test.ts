import { describe, expect, it } from 'vitest'
import type { Manufactory } from './types'
import {
  calculateMetrics,
  deriveTasks,
  parseBulkImport,
  upsertManufacture,
} from './crmUtils'

const baseRecord: Manufactory = {
  id: 'studio-nordton',
  name: 'Atelier Nordwear',
  contactPerson: 'Mara Stein',
  category: 'Streetwear',
  city: 'Hamburg',
  region: 'Hamburg',
  country: 'Deutschland',
  website: 'https://nordwear.example',
  email: 'hello@nordwear.example',
  phone: '+49 40 123456',
  social: '@ateliernordwear',
  products: 'Overshirts, Hoodies, Utility Pants',
  priceLevel: 'Premium',
  brandFit: 'A',
  cooperationPotential: 'Hoch',
  status: 'Antwort erhalten',
  priority: 'A',
  source: 'Instagram',
  lastContact: '2026-05-10',
  nextFollowUp: '2026-05-14',
  nextStep: 'Line Sheet anfragen',
  notes: 'Sehr guter Fashion-Fit',
}

describe('parseBulkImport', () => {
  it('maps copied spreadsheet headers into manufactory records', () => {
    const input = [
      'Name\tKategorie\tStadt\tE-Mail\tStatus\tPriorität\tNächster Follow-up',
      'Maison Ligne\tReady-to-Wear\tParis\tbonjour@ligne.example\tKontakt gefunden\tA-\t2026-05-18',
    ].join('\n')

    const result = parseBulkImport(input)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'Maison Ligne',
      category: 'Ready-to-Wear',
      city: 'Paris',
      email: 'bonjour@ligne.example',
      status: 'Kontakt gefunden',
      priority: 'A-',
      nextFollowUp: '2026-05-18',
    })
    expect(result[0].id).toContain('maison-ligne')
  })

  it('falls back to comma separated rows and sensible defaults', () => {
    const result = parseBulkImport('Name,Kategorie,Website\nOro Atelier,Schmuck,https://oro.example')

    expect(result[0]).toMatchObject({
      name: 'Oro Atelier',
      category: 'Schmuck',
      website: 'https://oro.example',
      status: 'Zu recherchieren',
      priority: 'B',
      brandFit: 'B',
      cooperationPotential: 'Mittel',
    })
  })
})

describe('calculateMetrics', () => {
  it('summarizes the CRM pipeline for the dashboard', () => {
    const metrics = calculateMetrics([
      baseRecord,
      {
        ...baseRecord,
        id: 'grain-form',
        name: 'Grain & Form',
        status: 'Zu recherchieren',
        priority: 'B',
        brandFit: 'B',
        cooperationPotential: 'Mittel',
        nextFollowUp: '2026-06-01',
      },
      {
        ...baseRecord,
        id: 'oro',
        name: 'Oro Werkstatt',
        status: 'Erstkontakt gesendet',
        priority: 'A',
        brandFit: 'A-',
        cooperationPotential: 'Hoch',
        nextFollowUp: '',
      },
    ], '2026-05-14')

    expect(metrics).toMatchObject({
      total: 3,
      highFit: 2,
      highPotential: 2,
      contacted: 2,
      dueFollowUps: 1,
    })
  })
})

describe('deriveTasks', () => {
  it('creates actionable tasks from next steps and overdue follow-ups', () => {
    const tasks = deriveTasks([baseRecord], '2026-05-15')

    expect(tasks).toEqual([
      expect.objectContaining({
        manufactureId: 'studio-nordton',
        title: 'Line Sheet anfragen',
        dueDate: '2026-05-14',
        urgency: 'overdue',
      }),
    ])
  })
})

describe('upsertManufacture', () => {
  it('updates existing records and appends new records', () => {
    const updated = upsertManufacture([baseRecord], { ...baseRecord, name: 'Atelier Nordwear GmbH' })
    const appended = upsertManufacture(updated, { ...baseRecord, id: 'maison-ligne', name: 'Maison Ligne' })

    expect(updated).toHaveLength(1)
    expect(updated[0].name).toBe('Atelier Nordwear GmbH')
    expect(appended).toHaveLength(2)
    expect(appended[1].name).toBe('Maison Ligne')
  })
})
