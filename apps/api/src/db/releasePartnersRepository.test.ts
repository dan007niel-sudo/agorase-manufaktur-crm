import { describe, expect, it } from 'vitest'
import type { ReleasePartnerLink } from '@agorase/shared'
import {
  deleteReleasePartnerLink,
  listReleasePartnerLinks,
  mapReleasePartnerLinkRow,
  normalizeReleasePartnerLinkInput,
  upsertReleasePartnerLink,
} from './releasePartnersRepository.js'

const link: ReleasePartnerLink = {
  releaseId: 'drop-1',
  partnerId: 'atelier-forma',
  role: 'Production',
  createdAt: '2026-05-15T00:00:00.000Z',
}

describe('releasePartnersRepository', () => {
  it('maps rows to release partner links', () => {
    expect(mapReleasePartnerLinkRow(rowFromLink(link))).toMatchObject({ releaseId: link.releaseId, partnerId: link.partnerId })
  })

  it('rejects links without partner ids', () => {
    expect(() => normalizeReleasePartnerLinkInput({ ...link, partnerId: '' })).toThrow('Partner id is required.')
  })

  it('lists links with a release filter', async () => {
    const pool = fakePool([{ rows: [rowFromLink(link)] }])

    await expect(listReleasePartnerLinks(pool, 'drop-1')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where release_id = $1')
    expect(pool.calls[0]?.values).toEqual(['drop-1'])
  })

  it('upserts and deletes links', async () => {
    const pool = fakePool([{ rows: [rowFromLink(link)] }, { rows: [] }])

    await upsertReleasePartnerLink(pool, link)
    await deleteReleasePartnerLink(pool, link.releaseId, link.partnerId)

    expect(pool.calls[0]?.sql).toContain('on conflict (release_id, partner_id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [link.releaseId, link.partnerId] })
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

function rowFromLink(item: ReleasePartnerLink) {
  return {
    release_id: item.releaseId,
    partner_id: item.partnerId,
    role: item.role,
    created_at: item.createdAt,
  }
}
