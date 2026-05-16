import {
  LEGAL_NOTE_STATUSES,
  LEGAL_RISK_LEVELS,
  type LegalChecklistItem,
  type LegalNote,
} from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'title',
  'topic',
  'jurisdiction',
  'risk_level',
  'status',
  'summary',
  'body',
  'checklist',
  'source_links',
  'next_action',
  'next_action_due',
  'responsible',
  'release_id',
  'partner_id',
  'notes',
] as const

type Row = Record<string, unknown>

export interface LegalNoteListFilters {
  status?: string
  risk?: string
  jurisdiction?: string
  releaseId?: string
  partnerId?: string
}

export function mapLegalNoteRow(row: Row): LegalNote {
  return {
    id: text(row.id),
    title: text(row.title),
    topic: text(row.topic),
    jurisdiction: text(row.jurisdiction),
    riskLevel: text(row.risk_level) as LegalNote['riskLevel'],
    status: text(row.status) as LegalNote['status'],
    summary: text(row.summary),
    body: text(row.body),
    checklist: parseChecklist(row.checklist),
    sourceLinks: text(row.source_links),
    nextAction: text(row.next_action),
    nextActionDue: text(row.next_action_due),
    responsible: text(row.responsible),
    releaseId: text(row.release_id),
    partnerId: text(row.partner_id),
    notes: text(row.notes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeLegalNoteInput(input: Partial<LegalNote>): LegalNote {
  const now = new Date(0).toISOString()
  const value: LegalNote = {
    id: text(input.id),
    title: text(input.title),
    topic: text(input.topic),
    jurisdiction: text(input.jurisdiction),
    riskLevel: oneOf(input.riskLevel, LEGAL_RISK_LEVELS, 'Invalid legal risk level.'),
    status: oneOf(input.status, LEGAL_NOTE_STATUSES, 'Invalid legal status.'),
    summary: text(input.summary),
    body: text(input.body),
    checklist: normalizeChecklist(input.checklist),
    sourceLinks: text(input.sourceLinks),
    nextAction: text(input.nextAction),
    nextActionDue: text(input.nextActionDue),
    responsible: text(input.responsible),
    releaseId: text(input.releaseId),
    partnerId: text(input.partnerId),
    notes: text(input.notes),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) throw new HttpError('invalid_legal_note', 'Legal note id is required.', 400)
  if (!value.title) throw new HttpError('invalid_legal_note', 'Legal note title is required.', 400)
  return value
}

export async function listLegalNotes(
  pool: DbPool,
  filters: LegalNoteListFilters = {},
): Promise<LegalNote[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }
  if (filters.risk) {
    values.push(filters.risk)
    where.push(`${where.length ? 'and ' : ''}risk_level = $${values.length}`)
  }
  if (filters.jurisdiction) {
    values.push(filters.jurisdiction)
    where.push(`${where.length ? 'and ' : ''}jurisdiction = $${values.length}`)
  }
  if (filters.releaseId) {
    values.push(filters.releaseId)
    where.push(`${where.length ? 'and ' : ''}release_id = $${values.length}`)
  }
  if (filters.partnerId) {
    values.push(filters.partnerId)
    where.push(`${where.length ? 'and ' : ''}partner_id = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from legal_notes${filter} order by risk_level desc, next_action_due asc, updated_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapLegalNoteRow(row as Row))
}

export async function upsertLegalNote(pool: DbPool, input: Partial<LegalNote>): Promise<LegalNote> {
  const note = normalizeLegalNoteInput(input)
  const values = [
    note.id,
    note.title,
    note.topic,
    note.jurisdiction,
    note.riskLevel,
    note.status,
    note.summary,
    note.body,
    JSON.stringify(note.checklist),
    note.sourceLinks,
    note.nextAction,
    note.nextActionDue,
    note.responsible,
    note.releaseId,
    note.partnerId,
    note.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into legal_notes (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapLegalNoteRow(result.rows[0] as Row)
}

export async function getLegalNote(pool: DbPool, id: string): Promise<LegalNote | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from legal_notes where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapLegalNoteRow(row as Row) : null
}

export async function deleteLegalNote(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from legal_notes where id = $1', [id])
}

export function createPostgresLegalNotesRepository(pool: DbPool) {
  return {
    list: (filters?: LegalNoteListFilters) => listLegalNotes(pool, filters),
    get: (id: string) => getLegalNote(pool, id),
    upsert: (note: LegalNote) => upsertLegalNote(pool, note),
    delete: (id: string) => deleteLegalNote(pool, id),
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
  throw new HttpError('invalid_legal_note', message, 400)
}

function parseChecklist(value: unknown): LegalChecklistItem[] {
  if (Array.isArray(value)) return normalizeChecklist(value as LegalChecklistItem[])
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return normalizeChecklist(parsed as LegalChecklistItem[])
    } catch {
      return []
    }
  }
  return []
}

function normalizeChecklist(value: LegalChecklistItem[] | undefined): LegalChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is LegalChecklistItem => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: text(item.id),
      label: text(item.label),
      done: item.done === true,
    }))
    .filter((item) => Boolean(item.id))
}
