import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateDropConcepts } from './creativeApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateDropConcepts', () => {
  it('POSTs to /api/creative/concepts with credentials and returns concepts', async () => {
    const concept = {
      title: 'Quiet Spring',
      story: 'Soft layers.',
      heroPiece: 'Oversized Shirt',
      palette: ['bone'],
      printDirection: '',
      mockupPrompt: 'Oversized shirt mockup',
      productionNotes: [],
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ concepts: [concept], model: 'gemini-2.5-flash' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const result = await generateDropConcepts({
      theme: 'Spring capsule',
      productMode: 'Oversized Shirt',
      tone: 'quiet, premium',
    })

    expect(result).toEqual([concept])
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/creative/concepts',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init?.body)) as Record<string, string>
    expect(body.theme).toBe('Spring capsule')
    expect(body.productMode).toBe('Oversized Shirt')
  })

  it('throws when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 502 }),
    )
    await expect(
      generateDropConcepts({ theme: 'X', productMode: '', tone: '' }),
    ).rejects.toThrow('boom')
  })
})
