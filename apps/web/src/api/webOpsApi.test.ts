import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WebOpsItem } from '@agorase/shared'
import {
  createWebOpsItem,
  deleteWebOpsItem,
  getWebOpsItem,
  listWebOpsItems,
  updateWebOpsItem,
} from './webOpsApi'

afterEach(() => vi.restoreAllMocks())

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
  seoDescription: 'First capsule.',
  seoKeywords: 'agorase, drop 1',
  checklist: [{ id: 'c1', label: 'Hero copy', done: true }],
  assignee: 'Daniel',
  dueDate: '2026-06-15',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('webOpsApi', () => {
  it('lists items with credentials and no query when no filters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [item] }), { status: 200 }))

    await expect(listWebOpsItems()).resolves.toEqual([item])

    expect(fetch).toHaveBeenCalledWith('/api/web-ops', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('lists items with release/kind/status filters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    )

    await listWebOpsItems({ releaseId: 'drop/1', kind: 'page-brief', status: 'ready' })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/web-ops?release=drop%2F1&kind=page-brief&status=ready',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('gets, creates, updates, and deletes items with encoded ids', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ item }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ item }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ item }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await getWebOpsItem('web/ops/1')
    await createWebOpsItem(item)
    await updateWebOpsItem('web/ops/1', { status: 'ready' })
    await deleteWebOpsItem('web/ops/1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/web-ops/web%2Fops%2F1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/web-ops',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/web-ops/web%2Fops%2F1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      '/api/web-ops/web%2Fops%2F1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })
})
