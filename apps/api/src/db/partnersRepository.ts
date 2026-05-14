import type { Manufactory } from '@agorase/shared'
import { categories, pipelineStatuses } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const priceLevels = ['Budget', 'Mittel', 'Premium', 'Luxus'] as const
const fitScores = ['A', 'A-', 'B+', 'B', 'C'] as const
const potentials = ['Hoch', 'Mittel', 'Niedrig'] as const
const priorities = ['A', 'A-', 'B', 'C'] as const

type PartnerRow = Record<string, string>

const columns = [
  'id',
  'name',
  'contact_person',
  'category',
  'city',
  'region',
  'country',
  'website',
  'email',
  'phone',
  'social',
  'products',
  'price_level',
  'brand_fit',
  'cooperation_potential',
  'status',
  'priority',
  'source',
  'last_contact',
  'next_follow_up',
  'next_step',
  'notes',
]

export function mapPartnerRow(row: PartnerRow): Manufactory {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || '',
    category: row.category as Manufactory['category'],
    city: row.city || '',
    region: row.region || '',
    country: row.country || '',
    website: row.website || '',
    email: row.email || '',
    phone: row.phone || '',
    social: row.social || '',
    products: row.products || '',
    priceLevel: row.price_level as Manufactory['priceLevel'],
    brandFit: row.brand_fit as Manufactory['brandFit'],
    cooperationPotential: row.cooperation_potential as Manufactory['cooperationPotential'],
    status: row.status as Manufactory['status'],
    priority: row.priority as Manufactory['priority'],
    source: row.source || '',
    lastContact: row.last_contact || '',
    nextFollowUp: row.next_follow_up || '',
    nextStep: row.next_step || '',
    notes: row.notes || '',
  }
}

export function normalizePartnerInput(input: Partial<Manufactory>): Manufactory {
  const partner: Manufactory = {
    id: text(input.id),
    name: text(input.name),
    contactPerson: text(input.contactPerson),
    category: oneOf(input.category, categories, 'Invalid partner category.'),
    city: text(input.city),
    region: text(input.region),
    country: text(input.country),
    website: text(input.website),
    email: text(input.email),
    phone: text(input.phone),
    social: text(input.social),
    products: text(input.products),
    priceLevel: oneOf(input.priceLevel, priceLevels, 'Invalid partner price level.'),
    brandFit: oneOf(input.brandFit, fitScores, 'Invalid partner brand fit.'),
    cooperationPotential: oneOf(input.cooperationPotential, potentials, 'Invalid partner potential.'),
    status: oneOf(input.status, pipelineStatuses, 'Invalid partner status.'),
    priority: oneOf(input.priority, priorities, 'Invalid partner priority.'),
    source: text(input.source),
    lastContact: text(input.lastContact),
    nextFollowUp: text(input.nextFollowUp),
    nextStep: text(input.nextStep),
    notes: text(input.notes),
  }

  if (!partner.id) throw new HttpError('invalid_partner', 'Partner id is required.', 400)
  if (!partner.name) throw new HttpError('invalid_partner', 'Partner name is required.', 400)
  return partner
}

export async function listPartners(pool: DbPool): Promise<Manufactory[]> {
  const result = await pool.query(`select ${columns.join(', ')} from partners order by updated_at desc, name asc`)
  return result.rows.map(mapPartnerRow)
}

export async function upsertPartner(pool: DbPool, input: Partial<Manufactory>): Promise<Manufactory> {
  const partner = normalizePartnerInput(input)
  const values = valuesFromPartner(partner)
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into partners (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}`,
    values,
  )
  return mapPartnerRow(result.rows[0] as PartnerRow)
}

export async function updatePartner(pool: DbPool, id: string, patch: Partial<Manufactory>): Promise<Manufactory> {
  const current = await pool.query(`select ${columns.join(', ')} from partners where id = $1`, [id])
  if (!current.rows[0]) throw new HttpError('partner_not_found', 'Partner not found.', 404)
  return upsertPartner(pool, { ...mapPartnerRow(current.rows[0] as PartnerRow), ...patch, id })
}

export async function deletePartner(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from partners where id = $1', [id])
}

export async function importPartners(pool: DbPool, partners: Partial<Manufactory>[]): Promise<Manufactory[]> {
  const saved: Manufactory[] = []
  for (const partner of partners) {
    saved.push(await upsertPartner(pool, partner))
  }
  return saved
}

export function createPostgresPartnersRepository(pool: DbPool) {
  return {
    list: () => listPartners(pool),
    upsert: (partner: Manufactory) => upsertPartner(pool, partner),
    update: (id: string, patch: Partial<Manufactory>) => updatePartner(pool, id, patch),
    delete: (id: string) => deletePartner(pool, id),
    importMany: (partners: Manufactory[]) => importPartners(pool, partners),
  }
}

function valuesFromPartner(partner: Manufactory) {
  return [
    partner.id,
    partner.name,
    partner.contactPerson,
    partner.category,
    partner.city,
    partner.region,
    partner.country,
    partner.website,
    partner.email,
    partner.phone,
    partner.social,
    partner.products,
    partner.priceLevel,
    partner.brandFit,
    partner.cooperationPotential,
    partner.status,
    partner.priority,
    partner.source,
    partner.lastContact,
    partner.nextFollowUp,
    partner.nextStep,
    partner.notes,
  ]
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_partner', message, 400)
}
