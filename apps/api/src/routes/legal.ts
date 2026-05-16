import type { LegalNote } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import type { LegalNoteListFilters } from '../db/legalNotesRepository.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface LegalNotesRepository {
  list(filters?: LegalNoteListFilters): Promise<LegalNote[]>
  get(id: string): Promise<LegalNote | null>
  upsert(note: LegalNote): Promise<LegalNote>
  delete(id: string): Promise<void>
}

export async function legalRoute(request: Request, env: ApiEnv, repository: LegalNotesRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const noteId = decodeURIComponent(pathname.replace('/api/legal/notes/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/legal/notes') {
      const filters: LegalNoteListFilters = {
        status: url.searchParams.get('status') ?? undefined,
        risk: url.searchParams.get('risk') ?? undefined,
        jurisdiction: url.searchParams.get('jurisdiction') ?? undefined,
        releaseId: url.searchParams.get('release') ?? url.searchParams.get('releaseId') ?? undefined,
        partnerId: url.searchParams.get('partner') ?? url.searchParams.get('partnerId') ?? undefined,
      }
      return jsonResponse({ notes: await repository.list(filters) }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/legal/notes') {
      const body = await readJson<LegalNote>(request)
      return jsonResponse({ note: await repository.upsert(body) }, 200, origin)
    }

    if (pathname.startsWith('/api/legal/notes/') && !noteId.includes('/')) {
      if (request.method === 'GET') {
        const note = await repository.get(noteId)
        if (!note) return errorResponse('legal_note_not_found', 'Legal note not found.', 404, origin)
        return jsonResponse({ note }, 200, origin)
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        const body = await readJson<Partial<LegalNote>>(request)
        const existing = request.method === 'PATCH' ? await repository.get(noteId) : null
        const merged = (existing ? { ...existing, ...body } : body) as LegalNote
        return jsonResponse(
          { note: await repository.upsert({ ...merged, id: noteId }) },
          200,
          origin,
        )
      }

      if (request.method === 'DELETE') {
        await repository.delete(noteId)
        return jsonResponse({}, 204, origin)
      }
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'legal_failed', 'Legal request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
