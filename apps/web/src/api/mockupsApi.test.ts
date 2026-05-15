import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MockupJob } from '@agorase/shared'
import {
  deleteMockupJob,
  generateMockup,
  getMockupJob,
  listMockupJobs,
} from './mockupsApi'

afterEach(() => vi.restoreAllMocks())

const job: MockupJob = {
  id: 'mockup-1',
  prompt: 'capsule SS27',
  referenceNotes: '',
  aspectRatio: '4:5',
  quality: 'standard',
  status: 'completed',
  modelUsed: 'gemini-3-pro-image-preview',
  imageUrl: 'https://example.test/img.png',
  imageData: '',
  mimeType: 'image/png',
  error: '',
  releaseId: 'drop-1',
  briefId: 'brief-1',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('mockupsApi', () => {
  it('lists jobs with credentials and filter parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ jobs: [job] }), { status: 200 }),
    )

    await expect(
      listMockupJobs({ status: 'completed', briefId: 'brief-1', releaseId: 'drop-1' }),
    ).resolves.toEqual([job])

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/mockups?status=completed&brief=brief-1&release=drop-1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('gets and deletes a job by id with encoding and credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ job }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(getMockupJob('mockup 1')).resolves.toEqual(job)
    await deleteMockupJob('mockup 1')

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/mockups/mockup%201',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/mockups/mockup%201',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('sends a generate request with credentials and returns the job', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ job }), { status: 200 }),
    )

    const response = await generateMockup({
      prompt: 'capsule SS27',
      aspect_ratio: '4:5',
      quality: 'standard',
      brief_id: 'brief-1',
      release_id: 'drop-1',
    })

    expect(response.job).toEqual(job)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/mockups/generate',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('throws when the server returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))

    await expect(listMockupJobs()).rejects.toThrow('boom')
  })
})
