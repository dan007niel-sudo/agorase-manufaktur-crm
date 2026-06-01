import type { DropConcept, DropConceptRequest, DropConceptResponse } from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

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

export async function generateDropConcepts(input: DropConceptRequest): Promise<DropConcept[]> {
  const body = await requestJson<DropConceptResponse>('/api/creative/concepts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return body.concepts
}
