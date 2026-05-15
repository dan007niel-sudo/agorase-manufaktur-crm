import { describe, expect, it } from 'vitest'
import type { FashionRelease } from '@agorase/shared'
import { deleteRelease, listReleases, mapReleaseRow, normalizeReleaseInput, upsertRelease } from './releasesRepository.js'

const release: FashionRelease = {
  id: 'drop-1',
  name: 'Drop 1',
  season: 'SS27',
  launchDate: '2026-07-01',
  status: 'planning',
  summary: 'First capsule.',
  contentStatus: 'drafting',
  readinessNotes: 'Need samples.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('releasesRepository', () => {
  it('maps rows to releases', () => {
    expect(mapReleaseRow(rowFromRelease(release))).toMatchObject({ id: release.id, status: 'planning' })
  })

  it('rejects releases without names', () => {
    expect(() => normalizeReleaseInput({ ...release, name: '' })).toThrow('Release name is required.')
  })

  it('lists releases ordered by launch date', async () => {
    const pool = fakePool([{ rows: [rowFromRelease(release)] }])

    await expect(listReleases(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('order by launch_date asc')
  })

  it('upserts and deletes releases', async () => {
    const pool = fakePool([{ rows: [rowFromRelease(release)] }, { rows: [] }])

    await upsertRelease(pool, release)
    await deleteRelease(pool, release.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [release.id] })
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

function rowFromRelease(item: FashionRelease) {
  return {
    id: item.id,
    name: item.name,
    season: item.season,
    launch_date: item.launchDate,
    status: item.status,
    summary: item.summary,
    content_status: item.contentStatus,
    readiness_notes: item.readinessNotes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
