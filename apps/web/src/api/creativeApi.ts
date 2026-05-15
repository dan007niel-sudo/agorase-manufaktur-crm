import type {
  BrainstormRequest,
  BrainstormResponse,
  CreativeBrief,
  CreativeBriefResponse,
  CreativeBriefsResponse,
  CreativeDirection,
  CreativeDirectionResponse,
  CreativeDirectionsResponse,
  PromptTemplate,
  PromptTemplateResponse,
  PromptTemplatesResponse,
} from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export interface CreativeBriefListFilters {
  status?: string
  releaseId?: string
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

export async function listCreativeBriefs(filters: CreativeBriefListFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.releaseId) params.set('release', filters.releaseId)
  const query = params.toString() ? `?${params.toString()}` : ''
  const body = await requestJson<CreativeBriefsResponse>(`/api/creative/briefs${query}`, { method: 'GET' })
  return body.briefs
}

export async function getCreativeBrief(id: string) {
  const body = await requestJson<CreativeBriefResponse>(
    `/api/creative/briefs/${encodeURIComponent(id)}`,
    { method: 'GET' },
  )
  return body.brief
}

export async function createCreativeBrief(brief: CreativeBrief) {
  const body = await requestJson<CreativeBriefResponse>('/api/creative/briefs', {
    method: 'POST',
    body: JSON.stringify(brief),
  })
  return body.brief
}

export async function updateCreativeBrief(id: string, patch: Partial<CreativeBrief>) {
  const body = await requestJson<CreativeBriefResponse>(
    `/api/creative/briefs/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  )
  return body.brief
}

export async function deleteCreativeBrief(id: string) {
  await requestJson<void>(`/api/creative/briefs/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listCreativeDirections(briefId?: string) {
  const query = briefId ? `?brief=${encodeURIComponent(briefId)}` : ''
  const body = await requestJson<CreativeDirectionsResponse>(`/api/creative/directions${query}`, {
    method: 'GET',
  })
  return body.directions
}

export async function createCreativeDirection(direction: CreativeDirection) {
  const body = await requestJson<CreativeDirectionResponse>('/api/creative/directions', {
    method: 'POST',
    body: JSON.stringify(direction),
  })
  return body.direction
}

export async function updateCreativeDirection(id: string, patch: Partial<CreativeDirection>) {
  const body = await requestJson<CreativeDirectionResponse>(
    `/api/creative/directions/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  )
  return body.direction
}

export async function deleteCreativeDirection(id: string) {
  await requestJson<void>(`/api/creative/directions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function listPromptTemplates() {
  const body = await requestJson<PromptTemplatesResponse>('/api/creative/prompt-templates', {
    method: 'GET',
  })
  return body.templates
}

export async function createPromptTemplate(template: PromptTemplate) {
  const body = await requestJson<PromptTemplateResponse>('/api/creative/prompt-templates', {
    method: 'POST',
    body: JSON.stringify(template),
  })
  return body.template
}

export async function updatePromptTemplate(id: string, patch: Partial<PromptTemplate>) {
  const body = await requestJson<PromptTemplateResponse>(
    `/api/creative/prompt-templates/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  )
  return body.template
}

export async function deletePromptTemplate(id: string) {
  await requestJson<void>(`/api/creative/prompt-templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function brainstormDirections(request: BrainstormRequest) {
  return requestJson<BrainstormResponse>('/api/creative/brainstorm', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
