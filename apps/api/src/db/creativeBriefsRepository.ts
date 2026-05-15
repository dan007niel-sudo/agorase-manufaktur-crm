import { CREATIVE_BRIEF_STATUSES, type CreativeBrief } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'title',
  'goal',
  'audience',
  'tone',
  '"references"',
  'season',
  'release_id',
  'status',
  'notes',
] as const

const updateColumns = [
  'title',
  'goal',
  'audience',
  'tone',
  '"references"',
  'season',
  'release_id',
  'status',
  'notes',
] as const

type Row = Record<string, unknown>

export interface CreativeBriefListFilters {
  status?: string
  releaseId?: string
}

export function mapCreativeBriefRow(row: Row): CreativeBrief {
  return {
    id: text(row.id),
    title: text(row.title),
    goal: text(row.goal),
    audience: text(row.audience),
    tone: text(row.tone),
    references: text(row.references),
    season: text(row.season),
    releaseId: text(row.release_id),
    status: text(row.status) as CreativeBrief['status'],
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeCreativeBriefInput(input: Partial<CreativeBrief>): CreativeBrief {
  const now = new Date(0).toISOString()
  const value: CreativeBrief = {
    id: text(input.id),
    title: text(input.title),
    goal: text(input.goal),
    audience: text(input.audience),
    tone: text(input.tone),
    references: text(input.references),
    season: text(input.season),
    releaseId: text(input.releaseId),
    status: oneOf(input.status ?? 'draft', CREATIVE_BRIEF_STATUSES, 'Invalid creative brief status.'),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) throw new HttpError('invalid_creative_brief', 'Creative brief id is required.', 400)
  if (!value.title) throw new HttpError('invalid_creative_brief', 'Creative brief title is required.', 400)
  return value
}

export async function listCreativeBriefs(
  pool: DbPool,
  filters: CreativeBriefListFilters = {},
): Promise<CreativeBrief[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }
  if (filters.releaseId) {
    values.push(filters.releaseId)
    where.push(`${where.length ? 'and ' : ''}release_id = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from creative_briefs${filter} order by updated_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapCreativeBriefRow(row as Row))
}

export async function upsertCreativeBrief(
  pool: DbPool,
  input: Partial<CreativeBrief>,
): Promise<CreativeBrief> {
  const brief = normalizeCreativeBriefInput(input)
  const values = [
    brief.id,
    brief.title,
    brief.goal,
    brief.audience,
    brief.tone,
    brief.references,
    brief.season,
    brief.releaseId,
    brief.status,
    brief.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')
  const result = await pool.query(
    `insert into creative_briefs (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapCreativeBriefRow(result.rows[0] as Row)
}

export async function getCreativeBrief(pool: DbPool, id: string): Promise<CreativeBrief | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from creative_briefs where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapCreativeBriefRow(row as Row) : null
}

export async function deleteCreativeBrief(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from creative_briefs where id = $1', [id])
}

export function createPostgresCreativeBriefsRepository(pool: DbPool) {
  return {
    list: (filters?: CreativeBriefListFilters) => listCreativeBriefs(pool, filters),
    get: (id: string) => getCreativeBrief(pool, id),
    upsert: (brief: CreativeBrief) => upsertCreativeBrief(pool, brief),
    delete: (id: string) => deleteCreativeBrief(pool, id),
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
  throw new HttpError('invalid_creative_brief', message, 400)
}
