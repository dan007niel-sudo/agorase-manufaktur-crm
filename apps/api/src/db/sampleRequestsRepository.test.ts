import { describe, expect, it } from 'vitest'
import type { SampleRequest } from '@agorase/shared'
import {
  deleteSampleRequest,
  listSampleRequests,
  mapSampleRequestRow,
  normalizeSampleRequestInput,
  upsertSampleRequest,
} from './sampleRequestsRepository.js'

const sample: SampleRequest = {
  id: 'sample-1',
  partnerId: 'atelier-forma',
  title: 'Overshirt sample',
  status: 'requested',
  requestedAt: '2026-05-15',
  targetDate: '2026-06-01',
  costEstimate: '120 EUR',
  notes: 'Use black twill.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('sampleRequestsRepository', () => {
  it('maps rows to sample requests', () => {
    expect(mapSampleRequestRow(rowFromSample(sample))).toMatchObject({ id: sample.id, status: 'requested' })
  })

  it('rejects samples without titles', () => {
    expect(() => normalizeSampleRequestInput({ ...sample, title: '' })).toThrow('Sample title is required.')
  })

  it('lists samples with a partner filter', async () => {
    const pool = fakePool([{ rows: [rowFromSample(sample)] }])

    await expect(listSampleRequests(pool, 'atelier-forma')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where partner_id = $1')
    expect(pool.calls[0]?.values).toEqual(['atelier-forma'])
  })

  it('upserts samples with parameterized SQL and deletes by id', async () => {
    const pool = fakePool([{ rows: [rowFromSample(sample)] }, { rows: [] }])

    await upsertSampleRequest(pool, sample)
    await deleteSampleRequest(pool, sample.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [sample.id] })
  })
})

function fakePool(results: Array<{ rows: Record<string, string>[] }>) {
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

function rowFromSample(item: SampleRequest) {
  return {
    id: item.id,
    partner_id: item.partnerId,
    title: item.title,
    status: item.status,
    requested_at: item.requestedAt,
    target_date: item.targetDate,
    cost_estimate: item.costEstimate,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
