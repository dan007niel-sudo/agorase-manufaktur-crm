import { describe, expect, it } from 'vitest'
import type { PartnerEvent } from '@agorase/shared'
import {
  deletePartnerEvent,
  listPartnerEvents,
  mapPartnerEventRow,
  normalizePartnerEventInput,
  upsertPartnerEvent,
} from './partnerEventsRepository.js'

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

describe('partnerEventsRepository', () => {
  it('maps rows to partner events', () => {
    expect(mapPartnerEventRow(rowFromEvent(event))).toMatchObject({ id: event.id, partnerId: event.partnerId, type: 'call' })
  })

  it('rejects events without partner ids', () => {
    expect(() => normalizePartnerEventInput({ ...event, partnerId: '' })).toThrow('Partner id is required.')
  })

  it('lists events with a partner filter', async () => {
    const pool = fakePool([{ rows: [rowFromEvent(event)] }])

    await expect(listPartnerEvents(pool, 'atelier-forma')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where partner_id = $1')
    expect(pool.calls[0]?.values).toEqual(['atelier-forma'])
  })

  it('upserts events with parameterized SQL', async () => {
    const pool = fakePool([{ rows: [rowFromEvent(event)] }])

    await expect(upsertPartnerEvent(pool, event)).resolves.toMatchObject({ id: event.id })

    expect(pool.calls[0]?.values).toContain(event.id)
    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
  })

  it('deletes events by id', async () => {
    const pool = fakePool([{ rows: [] }])

    await deletePartnerEvent(pool, event.id)

    expect(pool.calls[0]).toMatchObject({ values: [event.id] })
  })
})

function fakePool(results: Array<{ rows: Record<string, string>[] }>) {
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

function rowFromEvent(item: PartnerEvent) {
  return {
    id: item.id,
    partner_id: item.partnerId,
    type: item.type,
    title: item.title,
    body: item.body,
    event_date: item.eventDate,
    next_action: item.nextAction,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
