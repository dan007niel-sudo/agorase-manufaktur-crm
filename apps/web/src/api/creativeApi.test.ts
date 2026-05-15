import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CreativeBrief, CreativeDirection, PromptTemplate } from '@agorase/shared'
import {
  brainstormDirections,
  createCreativeBrief,
  createCreativeDirection,
  createPromptTemplate,
  deleteCreativeBrief,
  deleteCreativeDirection,
  deletePromptTemplate,
  getCreativeBrief,
  listCreativeBriefs,
  listCreativeDirections,
  listPromptTemplates,
  updateCreativeBrief,
  updateCreativeDirection,
  updatePromptTemplate,
} from './creativeApi'

afterEach(() => vi.restoreAllMocks())

const brief: CreativeBrief = {
  id: 'brief-1',
  title: 'Capsule SS27',
  goal: '',
  audience: '',
  tone: '',
  references: '',
  season: 'SS27',
  releaseId: 'drop-1',
  status: 'exploring',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const direction: CreativeDirection = {
  id: 'dir-1',
  briefId: 'brief-1',
  title: 'Quiet Knits',
  summary: '',
  body: '',
  keywords: '',
  palette: '',
  materials: '',
  silhouettes: '',
  promptUsed: '',
  modelUsed: '',
  source: 'manual',
  saved: true,
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const template: PromptTemplate = {
  id: 'tmpl-1',
  name: 'Capsule Brainstorm',
  description: '',
  category: 'capsule',
  body: 'Think in capsule terms.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('creativeApi', () => {
  it('lists briefs with credentials and filter parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ briefs: [brief] }), { status: 200 }),
    )

    await expect(listCreativeBriefs({ status: 'exploring', releaseId: 'drop-1' })).resolves.toEqual([brief])

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/creative/briefs?status=exploring&release=drop-1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('gets, creates, updates, and deletes a brief', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ brief }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ brief }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ brief }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await getCreativeBrief('brief 1')
    await createCreativeBrief(brief)
    await updateCreativeBrief('brief 1', { status: 'approved' })
    await deleteCreativeBrief('brief 1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/creative/briefs/brief%201',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/creative/briefs',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/creative/briefs/brief%201',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      '/api/creative/briefs/brief%201',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('lists directions filtered by brief', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ directions: [direction] }), { status: 200 }),
    )

    await expect(listCreativeDirections('brief-1')).resolves.toEqual([direction])
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/creative/directions?brief=brief-1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('creates, updates, and deletes a direction', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ direction }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ direction }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await createCreativeDirection(direction)
    await updateCreativeDirection('dir-1', { saved: true })
    await deleteCreativeDirection('dir-1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/creative/directions',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/creative/directions/dir-1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/creative/directions/dir-1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('lists, creates, updates, and deletes prompt templates', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ templates: [template] }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ template }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ template }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(listPromptTemplates()).resolves.toEqual([template])
    await createPromptTemplate(template)
    await updatePromptTemplate('tmpl-1', { name: 'Renamed' })
    await deletePromptTemplate('tmpl-1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/creative/prompt-templates',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      4,
      '/api/creative/prompt-templates/tmpl-1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('sends a brainstorm request and returns directions', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ directions: [direction], model: 'gemini-2.5-pro', prompt: 'p' }), {
        status: 200,
      }),
    )

    const response = await brainstormDirections({ prompt: 'capsule SS27', count: 3, brief_id: 'brief-1' })

    expect(response.directions).toEqual([direction])
    expect(response.model).toBe('gemini-2.5-pro')
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/creative/brainstorm',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('throws when the server returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }),
    )

    await expect(listCreativeBriefs()).rejects.toThrow('boom')
  })
})
