import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PartnerEvaluation } from '@agorase/shared'
import { listPartnerEvaluations, savePartnerEvaluation } from './partnerEvaluationsApi'

afterEach(() => vi.restoreAllMocks())

const evaluation: PartnerEvaluation = {
  id: 'eval-1',
  partnerId: 'atelier-forma',
  fitScore: 5,
  qualityScore: 4,
  termsScore: 3,
  riskScore: 2,
  readinessScore: 4,
  summary: 'Strong partner.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('partnerEvaluationsApi', () => {
  it('loads partner evaluations with optional partner filter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ evaluations: [evaluation] }), { status: 200 }))

    await expect(listPartnerEvaluations('atelier/forma')).resolves.toEqual([evaluation])

    expect(fetch).toHaveBeenCalledWith(
      '/api/partner-evaluations?partnerId=atelier%2Fforma',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('saves partner evaluations with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ evaluation }), { status: 200 }))

    await savePartnerEvaluation(evaluation)

    expect(fetch).toHaveBeenCalledWith(
      '/api/partner-evaluations/eval-1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
  })
})
