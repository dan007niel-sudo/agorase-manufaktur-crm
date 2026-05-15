import {
  WEB_OPS_KINDS,
  WEB_OPS_STATUSES,
  type WebOpsChecklistItem,
  type WebOpsItem,
} from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'release_id',
  'title',
  'kind',
  'status',
  'summary',
  'body',
  'target_url',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'checklist',
  'assignee',
  'due_date',
  'notes',
] as const

type Row = Record<string, unknown>

export interface WebOpsItemListFilters {
  releaseId?: string
  kind?: string
  status?: string
}

export function mapWebOpsItemRow(row: Row): WebOpsItem {
  return {
    id: text(row.id),
    releaseId: text(row.release_id),
    title: text(row.title),
    kind: text(row.kind) as WebOpsItem['kind'],
    status: text(row.status) as WebOpsItem['status'],
    summary: text(row.summary),
    body: text(row.body),
    targetUrl: text(row.target_url),
    seoTitle: text(row.seo_title),
    seoDescription: text(row.seo_description),
    seoKeywords: text(row.seo_keywords),
    checklist: parseChecklist(row.checklist),
    assignee: text(row.assignee),
    dueDate: text(row.due_date),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeWebOpsItemInput(input: Partial<WebOpsItem>): WebOpsItem {
  const now = new Date(0).toISOString()
  const value: WebOpsItem = {
    id: text(input.id),
    releaseId: text(input.releaseId),
    title: text(input.title),
    kind: oneOf(input.kind, WEB_OPS_KINDS, 'Invalid web ops kind.'),
    status: oneOf(input.status ?? 'idea', WEB_OPS_STATUSES, 'Invalid web ops status.'),
    summary: text(input.summary),
    body: text(input.body),
    targetUrl: text(input.targetUrl),
    seoTitle: text(input.seoTitle),
    seoDescription: text(input.seoDescription),
    seoKeywords: text(input.seoKeywords),
    checklist: normalizeChecklist(input.checklist),
    assignee: text(input.assignee),
    dueDate: text(input.dueDate),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) throw new HttpError('invalid_web_ops_item', 'Web ops id is required.', 400)
  if (!value.title) throw new HttpError('invalid_web_ops_item', 'Web ops title is required.', 400)
  return value
}

export async function listWebOpsItems(
  pool: DbPool,
  filters: WebOpsItemListFilters = {},
): Promise<WebOpsItem[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.releaseId) {
    values.push(filters.releaseId)
    where.push(`release_id = $${values.length}`)
  }
  if (filters.kind) {
    values.push(filters.kind)
    where.push(`${where.length ? 'and ' : ''}kind = $${values.length}`)
  }
  if (filters.status) {
    values.push(filters.status)
    where.push(`${where.length ? 'and ' : ''}status = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from web_ops_items${filter} order by status asc, due_date asc, updated_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapWebOpsItemRow(row as Row))
}

export async function upsertWebOpsItem(pool: DbPool, input: Partial<WebOpsItem>): Promise<WebOpsItem> {
  const item = normalizeWebOpsItemInput(input)
  const values = [
    item.id,
    item.releaseId,
    item.title,
    item.kind,
    item.status,
    item.summary,
    item.body,
    item.targetUrl,
    item.seoTitle,
    item.seoDescription,
    item.seoKeywords,
    JSON.stringify(item.checklist),
    item.assignee,
    item.dueDate,
    item.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into web_ops_items (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapWebOpsItemRow(result.rows[0] as Row)
}

export async function getWebOpsItem(pool: DbPool, id: string): Promise<WebOpsItem | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from web_ops_items where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapWebOpsItemRow(row as Row) : null
}

export async function deleteWebOpsItem(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from web_ops_items where id = $1', [id])
}

export function createPostgresWebOpsItemsRepository(pool: DbPool) {
  return {
    list: (filters?: WebOpsItemListFilters) => listWebOpsItems(pool, filters),
    get: (id: string) => getWebOpsItem(pool, id),
    upsert: (item: WebOpsItem) => upsertWebOpsItem(pool, item),
    delete: (id: string) => deleteWebOpsItem(pool, id),
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
  throw new HttpError('invalid_web_ops_item', message, 400)
}

function parseChecklist(value: unknown): WebOpsChecklistItem[] {
  if (Array.isArray(value)) return normalizeChecklist(value as WebOpsChecklistItem[])
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return normalizeChecklist(parsed as WebOpsChecklistItem[])
    } catch {
      return []
    }
  }
  return []
}

function normalizeChecklist(value: WebOpsChecklistItem[] | undefined): WebOpsChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is WebOpsChecklistItem => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: text(item.id),
      label: text(item.label),
      done: item.done === true,
    }))
    .filter((item) => Boolean(item.id))
}
