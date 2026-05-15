import type {
  WebOpsItem,
  WebOpsItemResponse,
  WebOpsItemsResponse,
} from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export interface WebOpsListFilters {
  releaseId?: string
  kind?: string
  status?: string
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

export async function listWebOpsItems(filters: WebOpsListFilters = {}) {
  const params = new URLSearchParams()
  if (filters.releaseId) params.set('release', filters.releaseId)
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.status) params.set('status', filters.status)
  const query = params.toString() ? `?${params.toString()}` : ''
  const body = await requestJson<WebOpsItemsResponse>(`/api/web-ops${query}`, { method: 'GET' })
  return body.items
}

export async function getWebOpsItem(id: string) {
  const body = await requestJson<WebOpsItemResponse>(`/api/web-ops/${encodeURIComponent(id)}`, { method: 'GET' })
  return body.item
}

export async function createWebOpsItem(item: WebOpsItem) {
  const body = await requestJson<WebOpsItemResponse>('/api/web-ops', {
    method: 'POST',
    body: JSON.stringify(item),
  })
  return body.item
}

export async function updateWebOpsItem(id: string, patch: Partial<WebOpsItem>) {
  const body = await requestJson<WebOpsItemResponse>(`/api/web-ops/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return body.item
}

export async function deleteWebOpsItem(id: string) {
  await requestJson<void>(`/api/web-ops/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
