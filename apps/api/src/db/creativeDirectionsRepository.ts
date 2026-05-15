import { CREATIVE_DIRECTION_SOURCES, type CreativeDirection } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'brief_id',
  'title',
  'summary',
  'body',
  'keywords',
  'palette',
  'materials',
  'silhouettes',
  'prompt_used',
  'model_used',
  'source',
  'saved',
  'notes',
] as const

type Row = Record<string, unknown>

export interface CreativeDirectionListFilters {
  briefId?: string
}

export function mapCreativeDirectionRow(row: Row): CreativeDirection {
  return {
    id: text(row.id),
    briefId: text(row.brief_id),
    title: text(row.title),
    summary: text(row.summary),
    body: text(row.body),
    keywords: text(row.keywords),
    palette: text(row.palette),
    materials: text(row.materials),
    silhouettes: text(row.silhouettes),
    promptUsed: text(row.prompt_used),
    modelUsed: text(row.model_used),
    source: text(row.source) as CreativeDirection['source'],
    saved: row.saved === true,
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeCreativeDirectionInput(
  input: Partial<CreativeDirection>,
): CreativeDirection {
  const now = new Date(0).toISOString()
  const value: CreativeDirection = {
    id: text(input.id),
    briefId: text(input.briefId),
    title: text(input.title),
    summary: text(input.summary),
    body: text(input.body),
    keywords: text(input.keywords),
    palette: text(input.palette),
    materials: text(input.materials),
    silhouettes: text(input.silhouettes),
    promptUsed: text(input.promptUsed),
    modelUsed: text(input.modelUsed),
    source: oneOf(input.source ?? 'manual', CREATIVE_DIRECTION_SOURCES, 'Invalid creative direction source.'),
    saved: input.saved !== false,
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) {
    throw new HttpError('invalid_creative_direction', 'Creative direction id is required.', 400)
  }
  if (!value.briefId) {
    throw new HttpError('invalid_creative_direction', 'Creative direction briefId is required.', 400)
  }
  if (!value.title) {
    throw new HttpError('invalid_creative_direction', 'Creative direction title is required.', 400)
  }
  return value
}

export async function listCreativeDirections(
  pool: DbPool,
  filters: CreativeDirectionListFilters = {},
): Promise<CreativeDirection[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.briefId) {
    values.push(filters.briefId)
    where.push(`brief_id = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from creative_directions${filter} order by created_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapCreativeDirectionRow(row as Row))
}

export async function upsertCreativeDirection(
  pool: DbPool,
  input: Partial<CreativeDirection>,
): Promise<CreativeDirection> {
  const direction = normalizeCreativeDirectionInput(input)
  const values = [
    direction.id,
    direction.briefId,
    direction.title,
    direction.summary,
    direction.body,
    direction.keywords,
    direction.palette,
    direction.materials,
    direction.silhouettes,
    direction.promptUsed,
    direction.modelUsed,
    direction.source,
    direction.saved,
    direction.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into creative_directions (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapCreativeDirectionRow(result.rows[0] as Row)
}

export async function getCreativeDirection(
  pool: DbPool,
  id: string,
): Promise<CreativeDirection | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from creative_directions where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapCreativeDirectionRow(row as Row) : null
}

export async function deleteCreativeDirection(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from creative_directions where id = $1', [id])
}

export function createPostgresCreativeDirectionsRepository(pool: DbPool) {
  return {
    list: (filters?: CreativeDirectionListFilters) => listCreativeDirections(pool, filters),
    get: (id: string) => getCreativeDirection(pool, id),
    upsert: (direction: CreativeDirection) => upsertCreativeDirection(pool, direction),
    delete: (id: string) => deleteCreativeDirection(pool, id),
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
  throw new HttpError('invalid_creative_direction', message, 400)
}
