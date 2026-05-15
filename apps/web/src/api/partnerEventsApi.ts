import type { PartnerEvent, PartnerEventResponse, PartnerEventsResponse } from '@agorase/shared'

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

export async function listPartnerEvents(partnerId?: string) {
  const query = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : ''
  const body = await requestJson<PartnerEventsResponse>(`/api/partner-events${query}`, { method: 'GET' })
  return body.events
}

export async function savePartnerEvent(event: PartnerEvent) {
  const body = await requestJson<PartnerEventResponse>(`/api/partner-events/${encodeURIComponent(event.id)}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  })
  return body.event
}
