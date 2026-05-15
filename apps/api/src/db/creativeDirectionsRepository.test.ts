import { describe, expect, it } from 'vitest'
import type { CreativeDirection } from '@agorase/shared'
import {
  deleteCreativeDirection,
  listCreativeDirections,
  mapCreativeDirectionRow,
  normalizeCreativeDirectionInput,
  upsertCreativeDirection,
} from './creativeDirectionsRepository.js'

const direction: CreativeDirection = {
  id: 'dir-1',
  briefId: 'brief-1',
  title: 'Quiet Layered Knits',
  summary: 'Soft layered knit silhouettes',
  body: 'Body details',
  keywords: 'knit, layered, quiet',
  palette: 'bone, fog, charcoal',
  materials: 'merino, alpaca',
  silhouettes: 'oversized cardigan, longline tee',
  promptUsed: 'Brainstorm SS27 knit capsule',
  modelUsed: 'gemini-2.5-pro',
  source: 'ai',
  saved: true,
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('creativeDirectionsRepository', () => {
  it('maps rows to creative directions', () => {
    expect(mapCreativeDirectionRow(rowFromDirection(direction))).toMatchObject({
      id: 'dir-1',
      briefId: 'brief-1',
      source: 'ai',
      saved: true,
      palette: 'bone, fog, charcoal',
    })
  })

  it('rejects directions missing a brief id', () => {
    expect(() => normalizeCreativeDirectionInput({ ...direction, briefId: '' })).toThrow(
      'Creative direction briefId is required.',
    )
  })

  it('rejects directions with an unknown source', () => {
    expect(() =>
      normalizeCreativeDirectionInput({ ...direction, source: 'mystery' as CreativeDirection['source'] }),
    ).toThrow('Invalid creative direction source.')
  })

  it('lists directions filtered by brief', async () => {
    const pool = fakePool([{ rows: [rowFromDirection(direction)] }])

    await expect(listCreativeDirections(pool, { briefId: 'brief-1' })).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where brief_id = $1')
    expect(pool.calls[0]?.values).toEqual(['brief-1'])
  })

  it('upserts and deletes directions', async () => {
    const pool = fakePool([{ rows: [rowFromDirection(direction)] }, { rows: [] }])

    await upsertCreativeDirection(pool, direction)
    await deleteCreativeDirection(pool, direction.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [direction.id] })
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

function rowFromDirection(value: CreativeDirection): Row {
  return {
    id: value.id,
    brief_id: value.briefId,
    title: value.title,
    summary: value.summary,
    body: value.body,
    keywords: value.keywords,
    palette: value.palette,
    materials: value.materials,
    silhouettes: value.silhouettes,
    prompt_used: value.promptUsed,
    model_used: value.modelUsed,
    source: value.source,
    saved: value.saved,
    notes: value.notes,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
