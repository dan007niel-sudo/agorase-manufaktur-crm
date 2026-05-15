import type {
  GenerateMockupRequest,
  GenerateMockupResponse,
  MockupJob,
  MockupJobResponse,
  MockupJobsResponse,
} from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export interface MockupJobListFilters {
  status?: string
  briefId?: string
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

export async function listMockupJobs(filters: MockupJobListFilters = {}): Promise<MockupJob[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.briefId) params.set('brief', filters.briefId)
  if (filters.releaseId) params.set('release', filters.releaseId)
  const query = params.toString() ? `?${params.toString()}` : ''
  const body = await requestJson<MockupJobsResponse>(`/api/mockups${query}`, { method: 'GET' })
  return body.jobs
}

export async function getMockupJob(id: string): Promise<MockupJob> {
  const body = await requestJson<MockupJobResponse>(
    `/api/mockups/${encodeURIComponent(id)}`,
    { method: 'GET' },
  )
  return body.job
}

export async function deleteMockupJob(id: string): Promise<void> {
  await requestJson<void>(`/api/mockups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function generateMockup(request: GenerateMockupRequest): Promise<GenerateMockupResponse> {
  return requestJson<GenerateMockupResponse>('/api/mockups/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
