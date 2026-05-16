// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MockupJob, MockupReference } from '@agorase/shared'
import {
  deleteMockupJob,
  downloadMockupJob,
  generateMockup,
  getMockupJob,
  listMockupJobs,
  parseContentDispositionFilename,
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
  referenceImages: [],
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const sampleReference: MockupReference = {
  id: 'ref-1',
  name: 'inspo.png',
  data: 'aGVsbG8=',
  mimeType: 'image/png',
  kind: 'style',
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

  it('sends reference images in the generate request body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ job }), { status: 200 }),
    )

    await generateMockup({
      prompt: 'capsule SS27',
      reference_images: [sampleReference],
    })

    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.credentials).toBe('include')
    const body = JSON.parse(String(init?.body ?? '{}')) as { reference_images?: MockupReference[] }
    expect(body.reference_images).toEqual([sampleReference])
  })

  describe('downloadMockupJob', () => {
    it('triggers an anchor click with the parsed filename and credentials', async () => {
      const blob = new Blob([Uint8Array.from([1, 2, 3])], { type: 'image/png' })
      const blobResponse = new Response(blob, {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-disposition': 'attachment; filename="agorase-mockup-mockup-1-2026-05-16.png"',
        },
      })
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(blobResponse)
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
      const clickSpy = vi.fn()
      const originalCreate = document.createElement.bind(document)
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          const element = originalCreate(tag) as HTMLAnchorElement
          if (tag.toLowerCase() === 'a') {
            element.click = clickSpy
          }
          return element
        })

      await downloadMockupJob('mockup-1')

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/mockups/mockup-1/download',
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      )
      expect(createSpy).toHaveBeenCalledWith(blob)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(revokeSpy).toHaveBeenCalledWith('blob:test')

      // Inspect the anchor that was created
      const anchorCall = createElementSpy.mock.results.find(
        (result) => (result.value as HTMLElement).tagName === 'A',
      )
      const anchor = anchorCall?.value as HTMLAnchorElement
      expect(anchor.download).toBe('agorase-mockup-mockup-1-2026-05-16.png')
      expect(anchor.href).toContain('blob:test')
    })

    it('falls back to a default filename when the header is missing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(new Blob([Uint8Array.from([1])]), { status: 200 }),
      )
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
      const originalCreate = document.createElement.bind(document)
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          const element = originalCreate(tag) as HTMLAnchorElement
          if (tag.toLowerCase() === 'a') {
            element.click = vi.fn()
          }
          return element
        })

      await downloadMockupJob('mockup-1')

      const anchorCall = createElementSpy.mock.results.find(
        (result) => (result.value as HTMLElement).tagName === 'A',
      )
      const anchor = anchorCall?.value as HTMLAnchorElement
      expect(anchor.download).toBe('agorase-mockup-mockup-1.png')
    })

    it('throws when the server returns an error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }))
      await expect(downloadMockupJob('mockup-1')).rejects.toThrow('nope')
    })
  })

  it('parses Content-Disposition filename header variants', () => {
    expect(parseContentDispositionFilename('attachment; filename="hello.png"')).toBe('hello.png')
    expect(parseContentDispositionFilename('attachment; filename=hello.png')).toBe('hello.png')
    expect(parseContentDispositionFilename(null)).toBe('')
    expect(parseContentDispositionFilename('inline')).toBe('')
  })
})
