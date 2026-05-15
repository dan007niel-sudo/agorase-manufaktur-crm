import type { ReleaseTask } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const taskStatuses = ['open', 'done'] as const
const columns = ['id', 'release_id', 'title', 'status', 'owner', 'due_date', 'notes'] as const
type ReleaseTaskRow = Record<string, unknown>

export function mapReleaseTaskRow(row: ReleaseTaskRow): ReleaseTask {
  return {
    id: text(row.id),
    releaseId: text(row.release_id),
    title: text(row.title),
    status: text(row.status) as ReleaseTask['status'],
    owner: text(row.owner),
    dueDate: text(row.due_date),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeReleaseTaskInput(input: Partial<ReleaseTask>): ReleaseTask {
  const now = new Date(0).toISOString()
  const task: ReleaseTask = {
    id: text(input.id),
    releaseId: text(input.releaseId),
    title: text(input.title),
    status: oneOf(input.status ?? 'open', taskStatuses, 'Invalid release task status.'),
    owner: text(input.owner),
    dueDate: text(input.dueDate),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!task.id) throw new HttpError('invalid_release_task', 'Task id is required.', 400)
  if (!task.releaseId) throw new HttpError('invalid_release_task', 'Release id is required.', 400)
  if (!task.title) throw new HttpError('invalid_release_task', 'Task title is required.', 400)
  return task
}

export async function listReleaseTasks(pool: DbPool, releaseId = ''): Promise<ReleaseTask[]> {
  const filter = releaseId ? ' where release_id = $1' : ''
  const values = releaseId ? [releaseId] : undefined
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from release_tasks${filter} order by status asc, due_date asc, updated_at desc`,
    values,
  )
  return result.rows.map((row) => mapReleaseTaskRow(row as ReleaseTaskRow))
}

export async function upsertReleaseTask(pool: DbPool, input: Partial<ReleaseTask>): Promise<ReleaseTask> {
  const task = normalizeReleaseTaskInput(input)
  const values = [task.id, task.releaseId, task.title, task.status, task.owner, task.dueDate, task.notes]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into release_tasks (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapReleaseTaskRow(result.rows[0] as ReleaseTaskRow)
}

export async function deleteReleaseTask(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from release_tasks where id = $1', [id])
}

export function createPostgresReleaseTasksRepository(pool: DbPool) {
  return {
    list: (releaseId?: string) => listReleaseTasks(pool, releaseId),
    upsert: (task: ReleaseTask) => upsertReleaseTask(pool, task),
    delete: (id: string) => deleteReleaseTask(pool, id),
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
  throw new HttpError('invalid_release_task', message, 400)
}
