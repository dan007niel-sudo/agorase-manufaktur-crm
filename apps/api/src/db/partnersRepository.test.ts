import type { Manufactory } from '@agorase/shared'
import { describe, expect, it } from 'vitest'
import { HttpError } from '../http.js'
import {
  deletePartner,
  importPartners,
  mapPartnerRow,
  normalizePartnerInput,
  updatePartner,
  upsertPartner,
} from './partnersRepository.js'

const basePartner: Manufactory = {
  id: 'atelier-forma',
  name: 'Atelier Forma',
  contactPerson: 'Lena',
  category: 'Ready-to-Wear',
  city: 'Köln',
  region: 'NRW',
  country: 'Deutschland',
  website: 'https://forma.example',
  email: 'hello@forma.example',
  phone: '',
  social: '@atelierforma',
  products: 'Overshirts',
  priceLevel: 'Premium',
  brandFit: 'A',
  cooperationPotential: 'Hoch',
  status: 'Recherchiert',
  priority: 'A',
  source: 'KI-Recherche',
  lastContact: '',
  nextFollowUp: '',
  nextStep: 'Line Sheet prüfen',
  notes: 'Stark',
}

describe('partnersRepository', () => {
  it('maps database rows to Manufactory records', () => {
    expect(
      mapPartnerRow({
        id: 'atelier-forma',
        name: 'Atelier Forma',
        contact_person: 'Lena',
        category: 'Ready-to-Wear',
        city: 'Köln',
        region: 'NRW',
        country: 'Deutschland',
        website: 'https://forma.example',
        email: 'hello@forma.example',
        phone: '',
        social: '@atelierforma',
        products: 'Overshirts',
        price_level: 'Premium',
        brand_fit: 'A',
        cooperation_potential: 'Hoch',
        status: 'Recherchiert',
        priority: 'A',
        source: 'KI-Recherche',
        last_contact: '',
        next_follow_up: '',
        next_step: 'Line Sheet prüfen',
        notes: 'Stark',
      }),
    ).toMatchObject({
      id: 'atelier-forma',
      contactPerson: 'Lena',
      priceLevel: 'Premium',
      brandFit: 'A',
      nextStep: 'Line Sheet prüfen',
    })
  })

  it('rejects invalid enum values', () => {
    expect(() =>
      normalizePartnerInput({
        id: 'bad',
        name: 'Bad',
        category: 'Invalid',
        status: 'Recherchiert',
        priceLevel: 'Premium',
        brandFit: 'A',
        cooperationPotential: 'Hoch',
        priority: 'A',
      }),
    ).toThrow('Invalid partner category.')
  })

  it('upserts partners with parameterized SQL', async () => {
    const pool = fakePool([{ rows: [rowFromPartner(basePartner)] }])

    const saved = await upsertPartner(pool, basePartner)

    expect(saved).toMatchObject({ id: 'atelier-forma', name: 'Atelier Forma' })
    expect(pool.calls[0]?.values).toContain('atelier-forma')
    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
  })

  it('updates existing partners by merging the current row with the patch', async () => {
    const pool = fakePool([{ rows: [rowFromPartner(basePartner)] }, { rows: [rowFromPartner({ ...basePartner, status: 'Antwort erhalten' })] }])

    const updated = await updatePartner(pool, basePartner.id, { status: 'Antwort erhalten' })

    expect(updated.status).toBe('Antwort erhalten')
    expect(pool.calls[0]?.sql).toContain('where id = $1')
  })

  it('returns a 404 error when updating a missing partner', async () => {
    const pool = fakePool([{ rows: [] }])

    await expect(updatePartner(pool, 'missing', { status: 'Antwort erhalten' })).rejects.toMatchObject({
      code: 'partner_not_found',
      status: 404,
    } satisfies Partial<HttpError>)
  })

  it('deletes partners by id', async () => {
    const pool = fakePool([{ rows: [] }])

    await deletePartner(pool, 'atelier-forma')

    expect(pool.calls[0]).toMatchObject({ values: ['atelier-forma'] })
    expect(pool.calls[0]?.sql).toContain('delete from partners')
  })

  it('imports partners sequentially and returns saved records', async () => {
    const pool = fakePool([{ rows: [rowFromPartner(basePartner)] }, { rows: [rowFromPartner({ ...basePartner, id: 'second' })] }])

    const saved = await importPartners(pool, [basePartner, { ...basePartner, id: 'second' }])

    expect(saved.map((partner) => partner.id)).toEqual(['atelier-forma', 'second'])
  })
})

function fakePool(results: Array<{ rows: Record<string, string>[] }>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  return {
    calls,
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values })
      return results.shift() ?? { rows: [] }
    },
    async end() {
      return undefined
    },
  }
}

function rowFromPartner(partner: Manufactory) {
  return {
    id: partner.id,
    name: partner.name,
    contact_person: partner.contactPerson,
    category: partner.category,
    city: partner.city,
    region: partner.region,
    country: partner.country,
    website: partner.website,
    email: partner.email,
    phone: partner.phone,
    social: partner.social,
    products: partner.products,
    price_level: partner.priceLevel,
    brand_fit: partner.brandFit,
    cooperation_potential: partner.cooperationPotential,
    status: partner.status,
    priority: partner.priority,
    source: partner.source,
    last_contact: partner.lastContact,
    next_follow_up: partner.nextFollowUp,
    next_step: partner.nextStep,
    notes: partner.notes,
  }
}
