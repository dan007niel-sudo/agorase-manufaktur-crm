import type {
  LegalNote,
  LegalNoteResponse,
  LegalNotesResponse,
} from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export interface LegalNoteListFilters {
  status?: string
  risk?: string
  jurisdiction?: string
  releaseId?: string
  partnerId?: string
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function listLegalNotes(filters: LegalNoteListFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.risk) params.set('risk', filters.risk)
  if (filters.jurisdiction) params.set('jurisdiction', filters.jurisdiction)
  if (filters.releaseId) params.set('release', filters.releaseId)
  if (filters.partnerId) params.set('partner', filters.partnerId)
  const query = params.toString() ? `?${params.toString()}` : ''
  const body = await requestJson<LegalNotesResponse>(`/api/legal/notes${query}`, { method: 'GET' })
  return body.notes
}

export async function getLegalNote(id: string) {
  const body = await requestJson<LegalNoteResponse>(`/api/legal/notes/${encodeURIComponent(id)}`, { method: 'GET' })
  return body.note
}

export async function createLegalNote(note: LegalNote) {
  const body = await requestJson<LegalNoteResponse>('/api/legal/notes', {
    method: 'POST',
    body: JSON.stringify(note),
  })
  return body.note
}

export async function updateLegalNote(id: string, patch: Partial<LegalNote>) {
  const body = await requestJson<LegalNoteResponse>(`/api/legal/notes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return body.note
}

export async function deleteLegalNote(id: string) {
  await requestJson<void>(`/api/legal/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
