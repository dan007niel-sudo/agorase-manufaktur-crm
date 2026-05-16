import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LegalNote } from '@agorase/shared'
import { readEnv } from '../env.js'
import { buildSessionCookie } from '../auth/session.js'
import { handleRequest } from '../index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

const sampleNote: LegalNote = {
  id: 'legal-1',
  title: 'Impressum aktualisieren',
  topic: 'Impressum',
  jurisdiction: 'DE',
  riskLevel: 'high',
  status: 'in-review',
  summary: 'Adresse prüfen.',
  body: '',
  checklist: [],
  sourceLinks: '',
  nextAction: 'Anwältin kontaktieren',
  nextActionDue: '2026-06-01',
  responsible: 'Daniel',
  releaseId: '',
  partnerId: '',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

function authenticatedEnv(source: Record<string, string | undefined> = {}) {
  return readEnv({ ADMIN_PASSWORD: 'pw', SESSION_SECRET: 'secret', ...source })
}

function authenticatedHeaders(env = authenticatedEnv()) {
  return { cookie: buildSessionCookie(env) }
}

function fakeRepository(notes: LegalNote[] = [sampleNote]) {
  return {
    list: vi.fn(async () => notes),
    get: vi.fn(async (id: string) => notes.find((n) => n.id === id) ?? null),
    upsert: vi.fn(async (note: LegalNote) => note),
    delete: vi.fn(async () => undefined),
  }
}

function fullContext(envSource: Record<string, string | undefined> = {}) {
  return {
    env: authenticatedEnv(envSource),
    legalNotesRepository: fakeRepository(),
  }
}

describe('legal routes', () => {
  it('rejects unauthenticated legal note requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated detail requests', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/legal-1'),
      fullContext(),
    )
    expect(response.status).toBe(401)
  })

  it('lists legal notes with status, risk, and jurisdiction filters', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request(
        'http://localhost/api/legal/notes?status=in-review&risk=high&jurisdiction=DE&release=drop-1&partner=partner-1',
        {
          headers: authenticatedHeaders(context.env),
        },
      ),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ notes: [sampleNote] })
    expect(context.legalNotesRepository.list).toHaveBeenCalledWith({
      status: 'in-review',
      risk: 'high',
      jurisdiction: 'DE',
      releaseId: 'drop-1',
      partnerId: 'partner-1',
    })
  })

  it('creates a legal note via POST', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify(sampleNote),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ note: sampleNote })
    expect(context.legalNotesRepository.upsert).toHaveBeenCalledWith(sampleNote)
  })

  it('gets a single legal note by id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/legal-1', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ note: sampleNote })
  })

  it('returns 404 for a missing legal note', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/unknown', {
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(404)
  })

  it('updates a legal note by id with PUT and forces id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/legal-1', {
        method: 'PUT',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ ...sampleNote, id: 'ignored' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(context.legalNotesRepository.upsert).toHaveBeenCalledWith({
      ...sampleNote,
      id: 'legal-1',
    })
  })

  it('merges PATCH bodies with existing note', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/legal-1', {
        method: 'PATCH',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ status: 'resolved' }),
      }),
      context,
    )

    expect(response.status).toBe(200)
    expect(context.legalNotesRepository.upsert).toHaveBeenCalledWith({
      ...sampleNote,
      status: 'resolved',
      id: 'legal-1',
    })
  })

  it('deletes a legal note by id', async () => {
    const context = fullContext()
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes/legal-1', {
        method: 'DELETE',
        headers: authenticatedHeaders(context.env),
      }),
      context,
    )

    expect(response.status).toBe(204)
    expect(context.legalNotesRepository.delete).toHaveBeenCalledWith('legal-1')
  })

  it('returns 400 when input validation fails', async () => {
    const context = {
      env: authenticatedEnv(),
      legalNotesRepository: {
        list: vi.fn(),
        get: vi.fn(async () => null),
        upsert: vi.fn(async () => {
          throw new (await import('../http.js')).HttpError(
            'invalid_legal_note',
            'Legal note title is required.',
            400,
          )
        }),
        delete: vi.fn(),
      },
    }
    const response = await handleRequest(
      new Request('http://localhost/api/legal/notes', {
        method: 'POST',
        headers: authenticatedHeaders(context.env),
        body: JSON.stringify({ ...sampleNote, title: '' }),
      }),
      context,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_legal_note' },
    })
  })
})
