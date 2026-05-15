import type { PartnerEvaluation, PartnerEvaluationResponse, PartnerEvaluationsResponse } from '@agorase/shared'

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

export async function listPartnerEvaluations(partnerId?: string) {
  const query = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : ''
  const body = await requestJson<PartnerEvaluationsResponse>(`/api/partner-evaluations${query}`, { method: 'GET' })
  return body.evaluations
}

export async function savePartnerEvaluation(evaluation: PartnerEvaluation) {
  const body = await requestJson<PartnerEvaluationResponse>(`/api/partner-evaluations/${encodeURIComponent(evaluation.id)}`, {
    method: 'PUT',
    body: JSON.stringify(evaluation),
  })
  return body.evaluation
}
