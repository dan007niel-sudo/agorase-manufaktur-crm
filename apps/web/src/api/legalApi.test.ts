import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LegalNote } from '@agorase/shared'
import {
  createLegalNote,
  deleteLegalNote,
  getLegalNote,
  listLegalNotes,
  updateLegalNote,
} from './legalApi'

afterEach(() => vi.restoreAllMocks())

const note: LegalNote = {
  id: 'legal-1',
  title: 'Impressum DSGVO-konform halten',
  topic: 'DSGVO',
  jurisdiction: 'DE',
  riskLevel: 'high',
  status: 'in-review',
  summary: 'Impressum prüfen',
  body: '',
  checklist: [{ id: 'c1', label: 'Adresse aktualisieren', done: false }],
  sourceLinks: 'https://www.gesetze-im-internet.de/tmg/__5.html',
  nextAction: 'Counsel kontaktieren',
  nextActionDue: '2026-06-01',
  responsible: 'Daniel',
  releaseId: '',
  partnerId: '',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('legalApi', () => {
  it('lists notes with credentials and no query when no filters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ notes: [note] }), { status: 200 }))

    await expect(listLegalNotes()).resolves.toEqual([note])

    expect(fetch).toHaveBeenCalledWith(
      '/api/legal/notes',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('lists notes with all filters serialized', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ notes: [] }), { status: 200 }),
    )

    await listLegalNotes({
      status: 'open',
      risk: 'critical',
      jurisdiction: 'DE',
      releaseId: 'drop/1',
      partnerId: 'p1',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/legal/notes?status=open&risk=critical&jurisdiction=DE&release=drop%2F1&partner=p1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('gets, creates, updates, and deletes notes with encoded ids', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ note }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ note }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ note }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await getLegalNote('legal/1')
    await createLegalNote(note)
    await updateLegalNote('legal/1', { status: 'resolved' })
    await deleteLegalNote('legal/1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/legal/notes/legal%2F1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/legal/notes',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/legal/notes/legal%2F1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      '/api/legal/notes/legal%2F1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })
})
