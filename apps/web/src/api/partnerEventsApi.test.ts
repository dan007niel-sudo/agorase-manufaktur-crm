import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PartnerEvent } from '@agorase/shared'
import { listPartnerEvents, savePartnerEvent } from './partnerEventsApi'

afterEach(() => vi.restoreAllMocks())

const event: PartnerEvent = {
  id: 'evt-1',
  partnerId: 'atelier-forma',
  type: 'call',
  title: 'Intro call',
  body: 'Discussed samples.',
  eventDate: '2026-05-15',
  nextAction: 'Send brief',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('partnerEventsApi', () => {
  it('loads partner events with optional partner filter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ events: [event] }), { status: 200 }))

    await expect(listPartnerEvents('atelier/forma')).resolves.toEqual([event])

    expect(fetch).toHaveBeenCalledWith(
      '/api/partner-events?partnerId=atelier%2Fforma',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('saves partner events with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ event }), { status: 200 }))

    await savePartnerEvent(event)

    expect(fetch).toHaveBeenCalledWith('/api/partner-events/evt-1', expect.objectContaining({ method: 'PUT', credentials: 'include' }))
  })
})
