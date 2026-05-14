import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyManufacture } from './crmUtils'
import { importPartners, listPartners, savePartner, updatePartner } from './partnersApi'

afterEach(() => vi.restoreAllMocks())

describe('partnersApi', () => {
  it('loads partners from the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partners: [] }), { status: 200 }))

    await expect(listPartners()).resolves.toEqual([])

    expect(fetch).toHaveBeenCalledWith('/api/partners', expect.any(Object))
  })

  it('saves one partner through the API', async () => {
    const partner = createEmptyManufacture('Atelier Forma')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partner }), { status: 200 }))

    await expect(savePartner(partner)).resolves.toMatchObject({ name: 'Atelier Forma' })

    expect(fetch).toHaveBeenCalledWith(
      '/api/partners',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(partner) }),
    )
  })

  it('updates one partner through the API', async () => {
    const partner = createEmptyManufacture('Atelier Forma')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partner }), { status: 200 }))

    await expect(updatePartner(partner.id, { status: 'Antwort erhalten' })).resolves.toMatchObject({ name: 'Atelier Forma' })

    expect(fetch).toHaveBeenCalledWith(
      `/api/partners/${partner.id}`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'Antwort erhalten' }) }),
    )
  })

  it('imports partners through the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partners: [] }), { status: 200 }))

    await expect(importPartners([])).resolves.toEqual([])

    expect(fetch).toHaveBeenCalledWith('/api/partners/import', expect.objectContaining({ method: 'POST' }))
  })

  it('throws readable errors for failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }))

    await expect(listPartners()).rejects.toThrow('nope')
  })
})
