import type { PartnerEvent } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const eventTypes = ['note', 'email', 'call', 'meeting', 'follow_up', 'sample'] as const
const columns = ['id', 'partner_id', 'type', 'title', 'body', 'event_date', 'next_action'] as const
type EventRow = Record<string, unknown>

export function mapPartnerEventRow(row: EventRow): PartnerEvent {
  return {
    id: text(row.id),
    partnerId: text(row.partner_id),
    type: text(row.type) as PartnerEvent['type'],
    title: text(row.title),
    body: text(row.body),
    eventDate: text(row.event_date),
    nextAction: text(row.next_action),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizePartnerEventInput(input: Partial<PartnerEvent>): PartnerEvent {
  const now = new Date(0).toISOString()
  const event: PartnerEvent = {
    id: text(input.id),
    partnerId: text(input.partnerId),
    type: oneOf(input.type ?? 'note', eventTypes, 'Invalid partner event type.'),
    title: text(input.title),
    body: text(input.body),
    eventDate: text(input.eventDate),
    nextAction: text(input.nextAction),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!event.id) throw new HttpError('invalid_partner_event', 'Partner event id is required.', 400)
  if (!event.partnerId) throw new HttpError('invalid_partner_event', 'Partner id is required.', 400)
  if (!event.title) throw new HttpError('invalid_partner_event', 'Partner event title is required.', 400)
  return event
}

export async function listPartnerEvents(pool: DbPool, partnerId = ''): Promise<PartnerEvent[]> {
  const filter = partnerId ? ' where partner_id = $1' : ''
  const values = partnerId ? [partnerId] : undefined
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from partner_events${filter} order by event_date desc, updated_at desc`,
    values,
  )
  return result.rows.map((row) => mapPartnerEventRow(row as EventRow))
}

export async function upsertPartnerEvent(pool: DbPool, input: Partial<PartnerEvent>): Promise<PartnerEvent> {
  const event = normalizePartnerEventInput(input)
  const values = [event.id, event.partnerId, event.type, event.title, event.body, event.eventDate, event.nextAction]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into partner_events (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapPartnerEventRow(result.rows[0] as EventRow)
}

export async function updatePartnerEvent(pool: DbPool, id: string, patch: Partial<PartnerEvent>): Promise<PartnerEvent> {
  const current = await pool.query(`select ${columns.join(', ')}, created_at, updated_at from partner_events where id = $1`, [id])
  if (!current.rows[0] && !patch.id) throw new HttpError('partner_event_not_found', 'Partner event not found.', 404)
  return upsertPartnerEvent(pool, { ...(current.rows[0] ? mapPartnerEventRow(current.rows[0] as EventRow) : {}), ...patch, id })
}

export async function deletePartnerEvent(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from partner_events where id = $1', [id])
}

export function createPostgresPartnerEventsRepository(pool: DbPool) {
  return {
    list: (partnerId?: string) => listPartnerEvents(pool, partnerId),
    upsert: (event: PartnerEvent) => upsertPartnerEvent(pool, event),
    update: (id: string, patch: Partial<PartnerEvent>) => updatePartnerEvent(pool, id, patch),
    delete: (id: string) => deletePartnerEvent(pool, id),
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_partner_event', message, 400)
}
