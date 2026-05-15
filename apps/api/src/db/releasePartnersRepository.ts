import type { ReleasePartnerLink } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = ['release_id', 'partner_id', 'role'] as const
type ReleasePartnerRow = Record<string, unknown>

export function mapReleasePartnerLinkRow(row: ReleasePartnerRow): ReleasePartnerLink {
  return {
    releaseId: text(row.release_id),
    partnerId: text(row.partner_id),
    role: text(row.role),
    createdAt: iso(row.created_at),
  }
}

export function normalizeReleasePartnerLinkInput(input: Partial<ReleasePartnerLink>): ReleasePartnerLink {
  const link: ReleasePartnerLink = {
    releaseId: text(input.releaseId),
    partnerId: text(input.partnerId),
    role: text(input.role),
    createdAt: text(input.createdAt) || new Date(0).toISOString(),
  }
  if (!link.releaseId) throw new HttpError('invalid_release_partner', 'Release id is required.', 400)
  if (!link.partnerId) throw new HttpError('invalid_release_partner', 'Partner id is required.', 400)
  return link
}

export async function listReleasePartnerLinks(pool: DbPool, releaseId = ''): Promise<ReleasePartnerLink[]> {
  const filter = releaseId ? ' where release_id = $1' : ''
  const values = releaseId ? [releaseId] : undefined
  const result = await pool.query(`select ${columns.join(', ')}, created_at from release_partners${filter} order by created_at desc`, values)
  return result.rows.map((row) => mapReleasePartnerLinkRow(row as ReleasePartnerRow))
}

export async function upsertReleasePartnerLink(pool: DbPool, input: Partial<ReleasePartnerLink>): Promise<ReleasePartnerLink> {
  const link = normalizeReleasePartnerLinkInput(input)
  const values = [link.releaseId, link.partnerId, link.role]
  const result = await pool.query(
    `insert into release_partners (${columns.join(', ')})
     values ($1, $2, $3)
     on conflict (release_id, partner_id) do update set role = excluded.role
     returning ${columns.join(', ')}, created_at`,
    values,
  )
  return mapReleasePartnerLinkRow(result.rows[0] as ReleasePartnerRow)
}

export async function deleteReleasePartnerLink(pool: DbPool, releaseId: string, partnerId: string): Promise<void> {
  await pool.query('delete from release_partners where release_id = $1 and partner_id = $2', [releaseId, partnerId])
}

export function createPostgresReleasePartnersRepository(pool: DbPool) {
  return {
    list: (releaseId?: string) => listReleasePartnerLinks(pool, releaseId),
    upsert: (link: ReleasePartnerLink) => upsertReleasePartnerLink(pool, link),
    delete: (releaseId: string, partnerId: string) => deleteReleasePartnerLink(pool, releaseId, partnerId),
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}
