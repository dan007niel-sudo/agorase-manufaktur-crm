import {
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_JOB_STATUSES,
  MOCKUP_QUALITIES,
  type MockupJob,
} from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'prompt',
  'reference_notes',
  'aspect_ratio',
  'quality',
  'status',
  'model_used',
  'image_url',
  'image_data',
  'mime_type',
  'error',
  'release_id',
  'brief_id',
  'notes',
] as const

type Row = Record<string, unknown>

export interface MockupJobListFilters {
  status?: string
  briefId?: string
  releaseId?: string
}

export function mapMockupJobRow(row: Row): MockupJob {
  return {
    id: text(row.id),
    prompt: text(row.prompt),
    referenceNotes: text(row.reference_notes),
    aspectRatio: text(row.aspect_ratio) as MockupJob['aspectRatio'],
    quality: text(row.quality) as MockupJob['quality'],
    status: text(row.status) as MockupJob['status'],
    modelUsed: text(row.model_used),
    imageUrl: text(row.image_url),
    imageData: text(row.image_data),
    mimeType: text(row.mime_type),
    error: text(row.error),
    releaseId: text(row.release_id),
    briefId: text(row.brief_id),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeMockupJobInput(input: Partial<MockupJob>): MockupJob {
  const now = new Date(0).toISOString()
  const value: MockupJob = {
    id: text(input.id),
    prompt: text(input.prompt),
    referenceNotes: text(input.referenceNotes),
    aspectRatio: oneOf(input.aspectRatio ?? '1:1', MOCKUP_ASPECT_RATIOS, 'Invalid mockup aspect ratio.'),
    quality: oneOf(input.quality ?? 'standard', MOCKUP_QUALITIES, 'Invalid mockup quality.'),
    status: oneOf(input.status ?? 'pending', MOCKUP_JOB_STATUSES, 'Invalid mockup status.'),
    modelUsed: text(input.modelUsed),
    imageUrl: text(input.imageUrl),
    imageData: typeof input.imageData === 'string' ? input.imageData : '',
    mimeType: text(input.mimeType),
    error: text(input.error),
    releaseId: text(input.releaseId),
    briefId: text(input.briefId),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) throw new HttpError('invalid_mockup_job', 'Mockup job id is required.', 400)
  if (!value.prompt) throw new HttpError('invalid_mockup_job', 'Mockup prompt is required.', 400)
  return value
}

export async function listMockupJobs(
  pool: DbPool,
  filters: MockupJobListFilters = {},
): Promise<MockupJob[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }
  if (filters.briefId) {
    values.push(filters.briefId)
    where.push(`${where.length ? 'and ' : ''}brief_id = $${values.length}`)
  }
  if (filters.releaseId) {
    values.push(filters.releaseId)
    where.push(`${where.length ? 'and ' : ''}release_id = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from mockup_jobs${filter} order by created_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapMockupJobRow(row as Row))
}

export async function upsertMockupJob(pool: DbPool, input: Partial<MockupJob>): Promise<MockupJob> {
  const job = normalizeMockupJobInput(input)
  const values = [
    job.id,
    job.prompt,
    job.referenceNotes,
    job.aspectRatio,
    job.quality,
    job.status,
    job.modelUsed,
    job.imageUrl,
    job.imageData,
    job.mimeType,
    job.error,
    job.releaseId,
    job.briefId,
    job.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into mockup_jobs (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapMockupJobRow(result.rows[0] as Row)
}

export async function getMockupJob(pool: DbPool, id: string): Promise<MockupJob | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from mockup_jobs where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapMockupJobRow(row as Row) : null
}

export async function deleteMockupJob(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from mockup_jobs where id = $1', [id])
}

export function createPostgresMockupJobsRepository(pool: DbPool) {
  return {
    list: (filters?: MockupJobListFilters) => listMockupJobs(pool, filters),
    get: (id: string) => getMockupJob(pool, id),
    upsert: (job: MockupJob) => upsertMockupJob(pool, job),
    delete: (id: string) => deleteMockupJob(pool, id),
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
  throw new HttpError('invalid_mockup_job', message, 400)
}
