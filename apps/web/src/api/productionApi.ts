import type {
  ProductionProfile,
  ProductionProfileResponse,
  ProductionProfilesResponse,
  SampleRequest,
  SampleRequestResponse,
  SampleRequestsResponse,
} from '@agorase/shared'

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

export async function listProductionProfiles(partnerId?: string) {
  const query = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : ''
  const body = await requestJson<ProductionProfilesResponse>(`/api/production/profiles${query}`, { method: 'GET' })
  return body.profiles
}

export async function saveProductionProfile(profile: ProductionProfile) {
  const body = await requestJson<ProductionProfileResponse>(`/api/production/profiles/${encodeURIComponent(profile.partnerId)}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
  return body.profile
}

export async function listSampleRequests(partnerId?: string) {
  const query = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : ''
  const body = await requestJson<SampleRequestsResponse>(`/api/production/samples${query}`, { method: 'GET' })
  return body.samples
}

export async function saveSampleRequest(sample: SampleRequest) {
  const body = await requestJson<SampleRequestResponse>(`/api/production/samples/${encodeURIComponent(sample.id)}`, {
    method: 'PUT',
    body: JSON.stringify(sample),
  })
  return body.sample
}

export async function deleteSampleRequest(id: string) {
  await requestJson<void>(`/api/production/samples/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
