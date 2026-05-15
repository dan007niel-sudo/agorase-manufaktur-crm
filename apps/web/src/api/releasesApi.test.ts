import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FashionRelease, ReleasePartnerLink, ReleaseTask } from '@agorase/shared'
import {
  deleteReleasePartner,
  listReleasePartnerLinks,
  listReleaseTasks,
  listReleases,
  saveRelease,
  saveReleasePartner,
  saveReleaseTask,
} from './releasesApi'

afterEach(() => vi.restoreAllMocks())

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

const task: ReleaseTask = {
  id: 'task-1',
  releaseId: 'drop-1',
  title: 'Finalize line sheet',
  status: 'open',
  owner: 'Daniel',
  dueDate: '2026-06-01',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const link: ReleasePartnerLink = {
  releaseId: 'drop-1',
  partnerId: 'atelier-forma',
  role: 'Production',
  createdAt: '2026-05-15T00:00:00.000Z',
}

describe('releasesApi', () => {
  it('loads releases with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ releases: [release] }), { status: 200 }))

    await expect(listReleases()).resolves.toEqual([release])

    expect(fetch).toHaveBeenCalledWith('/api/releases', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('saves releases by encoded id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ release }), { status: 200 }))

    await saveRelease({ ...release, id: 'drop/one' })

    expect(fetch).toHaveBeenCalledWith('/api/releases/drop%2Fone', expect.objectContaining({ method: 'PUT', credentials: 'include' }))
  })

  it('loads and saves release tasks with credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ tasks: [task] }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ task }), { status: 200 }))

    await listReleaseTasks('drop/1')
    await saveReleaseTask(task)

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/releases/tasks?releaseId=drop%2F1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/releases/tasks/task-1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
  })

  it('loads, saves, and deletes release partner links with credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ links: [link] }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ link }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await listReleasePartnerLinks('drop/1')
    await saveReleasePartner(link)
    await deleteReleasePartner('drop/1', 'atelier/forma')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/releases/partners?releaseId=drop%2F1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/releases/partners/drop%2F1/atelier%2Fforma',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })
})
