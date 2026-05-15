import type { Manufactory, PartnerResponse, PartnersResponse } from '@agorase/shared'

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

  return (await response.json()) as T
}

export async function listPartners() {
  const body = await requestJson<PartnersResponse>('/api/partners', { method: 'GET' })
  return body.partners
}

export async function savePartner(partner: Manufactory) {
  const body = await requestJson<PartnerResponse>('/api/partners', {
    method: 'POST',
    body: JSON.stringify(partner),
  })
  return body.partner
}

export async function updatePartner(id: string, patch: Partial<Manufactory>) {
  const body = await requestJson<PartnerResponse>(`/api/partners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return body.partner
}

export async function importPartners(partners: Manufactory[]) {
  const body = await requestJson<PartnersResponse>('/api/partners/import', {
    method: 'POST',
    body: JSON.stringify({ partners }),
  })
  return body.partners
}
