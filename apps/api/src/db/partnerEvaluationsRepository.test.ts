import { describe, expect, it } from 'vitest'
import type { PartnerEvaluation } from '@agorase/shared'
import {
  deletePartnerEvaluation,
  listPartnerEvaluations,
  mapPartnerEvaluationRow,
  normalizePartnerEvaluationInput,
  upsertPartnerEvaluation,
} from './partnerEvaluationsRepository.js'

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

describe('partnerEvaluationsRepository', () => {
  it('maps rows to partner evaluations', () => {
    expect(mapPartnerEvaluationRow(rowFromEvaluation(evaluation))).toMatchObject({ id: evaluation.id, readinessScore: 4 })
  })

  it('rejects scores outside the 1 to 5 range', () => {
    expect(() => normalizePartnerEvaluationInput({ ...evaluation, riskScore: 6 })).toThrow(
      'Evaluation scores must be integers from 1 to 5.',
    )
  })

  it('lists evaluations with a partner filter', async () => {
    const pool = fakePool([{ rows: [rowFromEvaluation(evaluation)] }])

    await expect(listPartnerEvaluations(pool, 'atelier-forma')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where partner_id = $1')
    expect(pool.calls[0]?.values).toEqual(['atelier-forma'])
  })

  it('upserts evaluations with parameterized SQL', async () => {
    const pool = fakePool([{ rows: [rowFromEvaluation(evaluation)] }])

    await expect(upsertPartnerEvaluation(pool, evaluation)).resolves.toMatchObject({ id: evaluation.id })

    expect(pool.calls[0]?.values).toContain(evaluation.id)
    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
  })

  it('deletes evaluations by id', async () => {
    const pool = fakePool([{ rows: [] }])

    await deletePartnerEvaluation(pool, evaluation.id)

    expect(pool.calls[0]).toMatchObject({ values: [evaluation.id] })
  })
})

function fakePool(results: Array<{ rows: Record<string, string | number>[] }>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  return {
    calls,
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values })
      return results.shift() ?? { rows: [] }
    },
    async end() {
      return undefined
    },
  }
}

function rowFromEvaluation(item: PartnerEvaluation) {
  return {
    id: item.id,
    partner_id: item.partnerId,
    fit_score: item.fitScore,
    quality_score: item.qualityScore,
    terms_score: item.termsScore,
    risk_score: item.riskScore,
    readiness_score: item.readinessScore,
    summary: item.summary,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
