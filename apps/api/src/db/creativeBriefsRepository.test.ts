import { describe, expect, it } from 'vitest'
import type { CreativeBrief } from '@agorase/shared'
import {
  deleteCreativeBrief,
  listCreativeBriefs,
  mapCreativeBriefRow,
  normalizeCreativeBriefInput,
  upsertCreativeBrief,
} from './creativeBriefsRepository.js'

const brief: CreativeBrief = {
  id: 'brief-1',
  title: 'Capsule SS27',
  goal: 'A poetic core capsule.',
  audience: 'Discerning early adopters',
  tone: 'Quiet, tactile, confident',
  references: 'Margiela archives, dieter rams',
  season: 'SS27',
  releaseId: 'drop-1',
  status: 'exploring',
  notes: 'Initial draft from Daniel.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('creativeBriefsRepository', () => {
  it('maps rows to creative briefs', () => {
    expect(mapCreativeBriefRow(rowFromBrief(brief))).toMatchObject({
      id: 'brief-1',
      title: 'Capsule SS27',
      releaseId: 'drop-1',
      status: 'exploring',
      references: 'Margiela archives, dieter rams',
    })
  })

  it('rejects briefs without a title', () => {
    expect(() => normalizeCreativeBriefInput({ ...brief, title: '' })).toThrow(
      'Creative brief title is required.',
    )
  })

  it('rejects briefs with an unknown status', () => {
    expect(() =>
      normalizeCreativeBriefInput({ ...brief, status: 'mystery' as CreativeBrief['status'] }),
    ).toThrow('Invalid creative brief status.')
  })

  it('lists briefs ordered by updated_at desc', async () => {
    const pool = fakePool([{ rows: [rowFromBrief(brief)] }])

    await expect(listCreativeBriefs(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('from creative_briefs')
    expect(pool.calls[0]?.sql).toContain('order by updated_at desc')
  })

  it('filters listed briefs by status and release', async () => {
    const pool = fakePool([{ rows: [] }])

    await listCreativeBriefs(pool, { status: 'exploring', releaseId: 'drop-1' })

    expect(pool.calls[0]?.sql).toContain('where status = $1')
    expect(pool.calls[0]?.sql).toContain('and release_id = $2')
    expect(pool.calls[0]?.values).toEqual(['exploring', 'drop-1'])
  })

  it('upserts and deletes briefs', async () => {
    const pool = fakePool([{ rows: [rowFromBrief(brief)] }, { rows: [] }])

    await upsertCreativeBrief(pool, brief)
    await deleteCreativeBrief(pool, brief.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [brief.id] })
  })
})

type Row = Record<string, unknown>

function fakePool(results: Array<{ rows: Row[] }>) {
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

function rowFromBrief(value: CreativeBrief): Row {
  return {
    id: value.id,
    title: value.title,
    goal: value.goal,
    audience: value.audience,
    tone: value.tone,
    references: value.references,
    season: value.season,
    release_id: value.releaseId,
    status: value.status,
    notes: value.notes,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
