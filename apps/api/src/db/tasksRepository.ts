import { fashionOsSections, type OperationalTask } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const statuses = ['open', 'done'] as const
const priorities = ['low', 'medium', 'high'] as const
const columns = ['id', 'title', 'section', 'status', 'priority', 'partner_id', 'due_date', 'notes'] as const

type TaskRow = Record<string, unknown>

export function mapTaskRow(row: TaskRow): OperationalTask {
  return {
    id: text(row.id),
    title: text(row.title),
    section: text(row.section) as OperationalTask['section'],
    status: text(row.status) as OperationalTask['status'],
    priority: text(row.priority) as OperationalTask['priority'],
    partnerId: text(row.partner_id),
    dueDate: text(row.due_date),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeTaskInput(input: Partial<OperationalTask>): OperationalTask {
  const now = new Date(0).toISOString()
  const task: OperationalTask = {
    id: text(input.id),
    title: text(input.title),
    section: oneOf(input.section, fashionOsSections, 'Invalid task section.'),
    status: oneOf(input.status ?? 'open', statuses, 'Invalid task status.'),
    priority: oneOf(input.priority ?? 'medium', priorities, 'Invalid task priority.'),
    partnerId: text(input.partnerId),
    dueDate: text(input.dueDate),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }

  if (!task.id) throw new HttpError('invalid_task', 'Task id is required.', 400)
  if (!task.title) throw new HttpError('invalid_task', 'Task title is required.', 400)
  return task
}

export async function listTasks(pool: DbPool): Promise<OperationalTask[]> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from tasks order by status asc, due_date asc, updated_at desc`,
  )
  return result.rows.map((row) => mapTaskRow(row as TaskRow))
}

export async function upsertTask(pool: DbPool, input: Partial<OperationalTask>): Promise<OperationalTask> {
  const task = normalizeTaskInput(input)
  const values = valuesFromTask(task)
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into tasks (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapTaskRow(result.rows[0] as TaskRow)
}

export async function updateTask(pool: DbPool, id: string, patch: Partial<OperationalTask>): Promise<OperationalTask> {
  const current = await pool.query(`select ${columns.join(', ')}, created_at, updated_at from tasks where id = $1`, [id])
  if (!current.rows[0] && !patch.id) throw new HttpError('task_not_found', 'Task not found.', 404)
  return upsertTask(pool, { ...(current.rows[0] ? mapTaskRow(current.rows[0] as TaskRow) : {}), ...patch, id })
}

export async function deleteTask(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from tasks where id = $1', [id])
}

export function createPostgresTasksRepository(pool: DbPool) {
  return {
    list: () => listTasks(pool),
    upsert: (task: OperationalTask) => upsertTask(pool, task),
    update: (id: string, patch: Partial<OperationalTask>) => updateTask(pool, id, patch),
    delete: (id: string) => deleteTask(pool, id),
  }
}

function valuesFromTask(task: OperationalTask) {
  return [task.id, task.title, task.section, task.status, task.priority, task.partnerId, task.dueDate, task.notes]
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_task', message, 400)
}
