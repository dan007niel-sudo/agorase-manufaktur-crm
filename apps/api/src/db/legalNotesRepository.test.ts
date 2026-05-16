import { describe, expect, it } from 'vitest'
import type { LegalNote } from '@agorase/shared'
import {
  deleteLegalNote,
  listLegalNotes,
  mapLegalNoteRow,
  normalizeLegalNoteInput,
  upsertLegalNote,
} from './legalNotesRepository.js'

const note: LegalNote = {
  id: 'legal-1',
  title: 'Impressum aktualisieren',
  topic: 'Impressum',
  jurisdiction: 'DE',
  riskLevel: 'high',
  status: 'in-review',
  summary: 'Adresse und Vertretungsberechtigte prüfen.',
  body: 'Detaillierte Notizen zum Impressum.',
  checklist: [
    { id: 'c1', label: 'Adresse prüfen', done: true },
    { id: 'c2', label: 'Vertretungsberechtigte ergänzen', done: false },
  ],
  sourceLinks: 'https://www.gesetze-im-internet.de/tmg/__5.html',
  nextAction: 'Anwältin kontaktieren',
  nextActionDue: '2026-06-01',
  responsible: 'Daniel',
  releaseId: 'drop-1',
  partnerId: '',
  notes: 'Vor Launch erledigen.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('legalNotesRepository', () => {
  it('maps rows to legal notes', () => {
    expect(mapLegalNoteRow(rowFromNote(note))).toMatchObject({
      id: note.id,
      jurisdiction: 'DE',
      riskLevel: 'high',
      status: 'in-review',
      checklist: note.checklist,
    })
  })

  it('parses checklist JSON strings safely', () => {
    const row = { ...rowFromNote(note), checklist: JSON.stringify(note.checklist) }
    expect(mapLegalNoteRow(row).checklist).toEqual(note.checklist)
  })

  it('defaults to empty checklist when storage is null or malformed', () => {
    expect(mapLegalNoteRow({ ...rowFromNote(note), checklist: null }).checklist).toEqual([])
    expect(mapLegalNoteRow({ ...rowFromNote(note), checklist: 'not-json' }).checklist).toEqual([])
  })

  it('rejects notes without a title', () => {
    expect(() => normalizeLegalNoteInput({ ...note, title: '' })).toThrow(
      'Legal note title is required.',
    )
  })

  it('rejects notes with an unknown risk level', () => {
    expect(() =>
      normalizeLegalNoteInput({ ...note, riskLevel: 'extreme' as LegalNote['riskLevel'] }),
    ).toThrow('Invalid legal risk level.')
  })

  it('rejects notes with an unknown status', () => {
    expect(() =>
      normalizeLegalNoteInput({ ...note, status: 'mystery' as LegalNote['status'] }),
    ).toThrow('Invalid legal status.')
  })

  it('lists notes ordered by risk and next action due', async () => {
    const pool = fakePool([{ rows: [rowFromNote(note)] }])

    await expect(listLegalNotes(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('from legal_notes')
    expect(pool.calls[0]?.sql).toContain('order by risk_level desc')
  })

  it('filters listed notes by status, risk, and jurisdiction', async () => {
    const pool = fakePool([{ rows: [] }])

    await listLegalNotes(pool, {
      status: 'in-review',
      risk: 'high',
      jurisdiction: 'DE',
      releaseId: 'drop-1',
      partnerId: 'partner-1',
    })

    expect(pool.calls[0]?.sql).toContain('where status = $1')
    expect(pool.calls[0]?.sql).toContain('and risk_level = $2')
    expect(pool.calls[0]?.sql).toContain('and jurisdiction = $3')
    expect(pool.calls[0]?.sql).toContain('and release_id = $4')
    expect(pool.calls[0]?.sql).toContain('and partner_id = $5')
    expect(pool.calls[0]?.values).toEqual([
      'in-review',
      'high',
      'DE',
      'drop-1',
      'partner-1',
    ])
  })

  it('upserts and deletes notes', async () => {
    const pool = fakePool([{ rows: [rowFromNote(note)] }, { rows: [] }])

    await upsertLegalNote(pool, note)
    await deleteLegalNote(pool, note.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [note.id] })
  })
})

type Row = Record<string, unknown>

function fakePool(results: Array<{ rows: Row[] }>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  return {
    calls,
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values })
      return results.shift() ?? { rows: [] }
    },
    async end() {
      return undefined
    },
  }
}

function rowFromNote(value: LegalNote): Row {
  return {
    id: value.id,
    title: value.title,
    topic: value.topic,
    jurisdiction: value.jurisdiction,
    risk_level: value.riskLevel,
    status: value.status,
    summary: value.summary,
    body: value.body,
    checklist: value.checklist,
    source_links: value.sourceLinks,
    next_action: value.nextAction,
    next_action_due: value.nextActionDue,
    responsible: value.responsible,
    release_id: value.releaseId,
    partner_id: value.partnerId,
    notes: value.notes,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
