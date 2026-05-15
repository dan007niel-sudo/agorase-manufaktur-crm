import type { FashionRelease } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const releaseStatuses = ['idea', 'planning', 'production', 'content', 'ready', 'launched'] as const
const contentStatuses = ['not_started', 'drafting', 'review', 'ready'] as const
const columns = ['id', 'name', 'season', 'launch_date', 'status', 'summary', 'content_status', 'readiness_notes'] as const
type ReleaseRow = Record<string, unknown>

export function mapReleaseRow(row: ReleaseRow): FashionRelease {
  return {
    id: text(row.id),
    name: text(row.name),
    season: text(row.season),
    launchDate: text(row.launch_date),
    status: text(row.status) as FashionRelease['status'],
    summary: text(row.summary),
    contentStatus: text(row.content_status) as FashionRelease['contentStatus'],
    readinessNotes: text(row.readiness_notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeReleaseInput(input: Partial<FashionRelease>): FashionRelease {
  const now = new Date(0).toISOString()
  const release: FashionRelease = {
    id: text(input.id),
    name: text(input.name),
    season: text(input.season),
    launchDate: text(input.launchDate),
    status: oneOf(input.status ?? 'idea', releaseStatuses, 'Invalid release status.'),
    summary: text(input.summary),
    contentStatus: oneOf(input.contentStatus ?? 'not_started', contentStatuses, 'Invalid release content status.'),
    readinessNotes: text(input.readinessNotes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!release.id) throw new HttpError('invalid_release', 'Release id is required.', 400)
  if (!release.name) throw new HttpError('invalid_release', 'Release name is required.', 400)
  return release
}

export async function listReleases(pool: DbPool): Promise<FashionRelease[]> {
  const result = await pool.query(`select ${columns.join(', ')}, created_at, updated_at from releases order by launch_date asc, updated_at desc`)
  return result.rows.map((row) => mapReleaseRow(row as ReleaseRow))
}

export async function upsertRelease(pool: DbPool, input: Partial<FashionRelease>): Promise<FashionRelease> {
  const release = normalizeReleaseInput(input)
  const values = [
    release.id,
    release.name,
    release.season,
    release.launchDate,
    release.status,
    release.summary,
    release.contentStatus,
    release.readinessNotes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into releases (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapReleaseRow(result.rows[0] as ReleaseRow)
}

export async function deleteRelease(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from releases where id = $1', [id])
}

export function createPostgresReleasesRepository(pool: DbPool) {
  return {
    list: () => listReleases(pool),
    upsert: (release: FashionRelease) => upsertRelease(pool, release),
    delete: (id: string) => deleteRelease(pool, id),
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
  throw new HttpError('invalid_release', message, 400)
}
