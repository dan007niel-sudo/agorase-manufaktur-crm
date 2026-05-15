import { describe, expect, it } from 'vitest'
import type { ProductionProfile } from '@agorase/shared'
import {
  listProductionProfiles,
  mapProductionProfileRow,
  normalizeProductionProfileInput,
  upsertProductionProfile,
} from './productionProfilesRepository.js'

const profile: ProductionProfile = {
  partnerId: 'atelier-forma',
  capabilities: 'Cut and sew',
  materials: 'Cotton',
  moq: '50 units',
  leadTime: '6 weeks',
  certifications: 'GOTS',
  costNotes: 'Sample 120 EUR',
  qualityNotes: 'Clean finishing',
  readinessStatus: 'review',
  readinessScore: 70,
  blocker: '',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('productionProfilesRepository', () => {
  it('maps rows to production profiles', () => {
    expect(mapProductionProfileRow(rowFromProfile(profile))).toMatchObject({ partnerId: profile.partnerId, readinessScore: 70 })
  })

  it('rejects readiness scores outside 0 to 100', () => {
    expect(() => normalizeProductionProfileInput({ ...profile, readinessScore: 101 })).toThrow(
      'Readiness score must be an integer from 0 to 100.',
    )
  })

  it('lists profiles with a partner filter', async () => {
    const pool = fakePool([{ rows: [rowFromProfile(profile)] }])

    await expect(listProductionProfiles(pool, 'atelier-forma')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where partner_id = $1')
    expect(pool.calls[0]?.values).toEqual(['atelier-forma'])
  })

  it('upserts profiles with parameterized SQL', async () => {
    const pool = fakePool([{ rows: [rowFromProfile(profile)] }])

    await expect(upsertProductionProfile(pool, profile)).resolves.toMatchObject({ partnerId: profile.partnerId })

    expect(pool.calls[0]?.values).toContain(profile.partnerId)
    expect(pool.calls[0]?.sql).toContain('on conflict (partner_id) do update')
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

function rowFromProfile(item: ProductionProfile) {
  return {
    partner_id: item.partnerId,
    capabilities: item.capabilities,
    materials: item.materials,
    moq: item.moq,
    lead_time: item.leadTime,
    certifications: item.certifications,
    cost_notes: item.costNotes,
    quality_notes: item.qualityNotes,
    readiness_status: item.readinessStatus,
    readiness_score: item.readinessScore,
    blocker: item.blocker,
    updated_at: item.updatedAt,
  }
}
