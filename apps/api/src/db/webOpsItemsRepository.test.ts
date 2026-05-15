import { describe, expect, it } from 'vitest'
import type { WebOpsItem } from '@agorase/shared'
import {
  deleteWebOpsItem,
  listWebOpsItems,
  mapWebOpsItemRow,
  normalizeWebOpsItemInput,
  upsertWebOpsItem,
} from './webOpsItemsRepository.js'

const item: WebOpsItem = {
  id: 'web-ops-1',
  releaseId: 'drop-1',
  title: 'Launch landing page',
  kind: 'page-brief',
  status: 'in-progress',
  summary: 'Hero, story, CTA.',
  body: 'Long brief body.',
  targetUrl: '/drop-1',
  seoTitle: 'Drop 1 — Agorase',
  seoDescription: 'First capsule from Agorase.',
  seoKeywords: 'agorase, drop 1, capsule',
  checklist: [
    { id: 'c1', label: 'Hero copy', done: true },
    { id: 'c2', label: 'Meta image', done: false },
  ],
  assignee: 'Daniel',
  dueDate: '2026-06-15',
  notes: 'Coordinate with content team.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('webOpsItemsRepository', () => {
  it('maps rows to web ops items', () => {
    expect(mapWebOpsItemRow(rowFromItem(item))).toMatchObject({
      id: item.id,
      releaseId: 'drop-1',
      kind: 'page-brief',
      status: 'in-progress',
      checklist: item.checklist,
    })
  })

  it('parses checklist JSON strings safely', () => {
    const row = { ...rowFromItem(item), checklist: JSON.stringify(item.checklist) }
    expect(mapWebOpsItemRow(row).checklist).toEqual(item.checklist)
  })

  it('defaults to empty checklist when storage is null or malformed', () => {
    expect(mapWebOpsItemRow({ ...rowFromItem(item), checklist: null }).checklist).toEqual([])
    expect(mapWebOpsItemRow({ ...rowFromItem(item), checklist: 'not-json' }).checklist).toEqual([])
  })

  it('rejects items without a title', () => {
    expect(() => normalizeWebOpsItemInput({ ...item, title: '' })).toThrow('Web ops title is required.')
  })

  it('rejects items with an unknown kind', () => {
    expect(() => normalizeWebOpsItemInput({ ...item, kind: 'unknown' as WebOpsItem['kind'] })).toThrow(
      'Invalid web ops kind.',
    )
  })

  it('rejects items with an unknown status', () => {
    expect(() => normalizeWebOpsItemInput({ ...item, status: 'mystery' as WebOpsItem['status'] })).toThrow(
      'Invalid web ops status.',
    )
  })

  it('lists items ordered by status and due date', async () => {
    const pool = fakePool([{ rows: [rowFromItem(item)] }])

    await expect(listWebOpsItems(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('from web_ops_items')
    expect(pool.calls[0]?.sql).toContain('order by status asc')
  })

  it('filters listed items by release, kind, and status', async () => {
    const pool = fakePool([{ rows: [] }])

    await listWebOpsItems(pool, { releaseId: 'drop-1', kind: 'page-brief', status: 'ready' })

    expect(pool.calls[0]?.sql).toContain('where release_id = $1')
    expect(pool.calls[0]?.sql).toContain('and kind = $2')
    expect(pool.calls[0]?.sql).toContain('and status = $3')
    expect(pool.calls[0]?.values).toEqual(['drop-1', 'page-brief', 'ready'])
  })

  it('upserts and deletes items', async () => {
    const pool = fakePool([{ rows: [rowFromItem(item)] }, { rows: [] }])

    await upsertWebOpsItem(pool, item)
    await deleteWebOpsItem(pool, item.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [item.id] })
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

function rowFromItem(value: WebOpsItem): Row {
  return {
    id: value.id,
    release_id: value.releaseId,
    title: value.title,
    kind: value.kind,
    status: value.status,
    summary: value.summary,
    body: value.body,
    target_url: value.targetUrl,
    seo_title: value.seoTitle,
    seo_description: value.seoDescription,
    seo_keywords: value.seoKeywords,
    checklist: value.checklist,
    assignee: value.assignee,
    due_date: value.dueDate,
    notes: value.notes,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
