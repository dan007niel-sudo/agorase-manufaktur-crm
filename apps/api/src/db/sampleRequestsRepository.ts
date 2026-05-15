import type { SampleRequest } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const sampleStatuses = ['planned', 'requested', 'received', 'approved', 'rejected'] as const
const columns = ['id', 'partner_id', 'title', 'status', 'requested_at', 'target_date', 'cost_estimate', 'notes'] as const
type SampleRequestRow = Record<string, unknown>

export function mapSampleRequestRow(row: SampleRequestRow): SampleRequest {
  return {
    id: text(row.id),
    partnerId: text(row.partner_id),
    title: text(row.title),
    status: text(row.status) as SampleRequest['status'],
    requestedAt: text(row.requested_at),
    targetDate: text(row.target_date),
    costEstimate: text(row.cost_estimate),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeSampleRequestInput(input: Partial<SampleRequest>): SampleRequest {
  const now = new Date(0).toISOString()
  const sample: SampleRequest = {
    id: text(input.id),
    partnerId: text(input.partnerId),
    title: text(input.title),
    status: oneOf(input.status ?? 'planned', sampleStatuses, 'Invalid sample status.'),
    requestedAt: text(input.requestedAt),
    targetDate: text(input.targetDate),
    costEstimate: text(input.costEstimate),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!sample.id) throw new HttpError('invalid_sample_request', 'Sample id is required.', 400)
  if (!sample.partnerId) throw new HttpError('invalid_sample_request', 'Partner id is required.', 400)
  if (!sample.title) throw new HttpError('invalid_sample_request', 'Sample title is required.', 400)
  return sample
}

export async function listSampleRequests(pool: DbPool, partnerId = ''): Promise<SampleRequest[]> {
  const filter = partnerId ? ' where partner_id = $1' : ''
  const values = partnerId ? [partnerId] : undefined
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from sample_requests${filter} order by target_date asc, updated_at desc`,
    values,
  )
  return result.rows.map((row) => mapSampleRequestRow(row as SampleRequestRow))
}

export async function upsertSampleRequest(pool: DbPool, input: Partial<SampleRequest>): Promise<SampleRequest> {
  const sample = normalizeSampleRequestInput(input)
  const values = [
    sample.id,
    sample.partnerId,
    sample.title,
    sample.status,
    sample.requestedAt,
    sample.targetDate,
    sample.costEstimate,
    sample.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into sample_requests (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapSampleRequestRow(result.rows[0] as SampleRequestRow)
}

export async function deleteSampleRequest(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from sample_requests where id = $1', [id])
}

export function createPostgresSampleRequestsRepository(pool: DbPool) {
  return {
    list: (partnerId?: string) => listSampleRequests(pool, partnerId),
    upsert: (sample: SampleRequest) => upsertSampleRequest(pool, sample),
    delete: (id: string) => deleteSampleRequest(pool, id),
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
  throw new HttpError('invalid_sample_request', message, 400)
}
