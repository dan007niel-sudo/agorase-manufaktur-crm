import type {
  GenerateMockupRequest,
  GenerateMockupResponse,
  MockupJob,
  MockupJobResponse,
  MockupJobsResponse,
} from '@agorase/shared'

export type { GenerateMockupRequest } from '@agorase/shared'

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

export async function downloadMockupJob(id: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/mockups/${encodeURIComponent(id)}/download`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Download failed with status ${response.status}`)
  }
  const blob = await response.blob()
  const filename = parseContentDispositionFilename(response.headers.get('content-disposition')) ||
    `agorase-mockup-${id}.png`
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function parseContentDispositionFilename(header: string | null): string {
  if (!header) return ''
  // Prefer RFC 5987 filename* if present
  const star = header.match(/filename\*=([^;]+)/i)
  if (star && star[1]) {
    const value = star[1].trim()
    const match = value.match(/^[^']*'[^']*'(.*)$/)
    const raw = match ? match[1] : value
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  const simple = header.match(/filename="?([^";]+)"?/i)
  return simple && simple[1] ? simple[1].trim() : ''
}
