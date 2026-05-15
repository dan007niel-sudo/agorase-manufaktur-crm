import type { ProductionProfile } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const readinessStatuses = ['unknown', 'blocked', 'review', 'ready'] as const
const columns = [
  'partner_id',
  'capabilities',
  'materials',
  'moq',
  'lead_time',
  'certifications',
  'cost_notes',
  'quality_notes',
  'readiness_status',
  'readiness_score',
  'blocker',
] as const

type ProductionProfileRow = Record<string, unknown>

export function mapProductionProfileRow(row: ProductionProfileRow): ProductionProfile {
  return {
    partnerId: text(row.partner_id),
    capabilities: text(row.capabilities),
    materials: text(row.materials),
    moq: text(row.moq),
    leadTime: text(row.lead_time),
    certifications: text(row.certifications),
    costNotes: text(row.cost_notes),
    qualityNotes: text(row.quality_notes),
    readinessStatus: text(row.readiness_status) as ProductionProfile['readinessStatus'],
    readinessScore: number(row.readiness_score),
    blocker: text(row.blocker),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizeProductionProfileInput(input: Partial<ProductionProfile>): ProductionProfile {
  const profile: ProductionProfile = {
    partnerId: text(input.partnerId),
    capabilities: text(input.capabilities),
    materials: text(input.materials),
    moq: text(input.moq),
    leadTime: text(input.leadTime),
    certifications: text(input.certifications),
    costNotes: text(input.costNotes),
    qualityNotes: text(input.qualityNotes),
    readinessStatus: oneOf(input.readinessStatus ?? 'unknown', readinessStatuses, 'Invalid readiness status.'),
    readinessScore: readinessScore(input.readinessScore ?? 0),
    blocker: text(input.blocker),
    updatedAt: text(input.updatedAt) || new Date(0).toISOString(),
  }

  if (!profile.partnerId) throw new HttpError('invalid_production_profile', 'Partner id is required.', 400)
  return profile
}

export async function listProductionProfiles(pool: DbPool, partnerId = ''): Promise<ProductionProfile[]> {
  const filter = partnerId ? ' where partner_id = $1' : ''
  const values = partnerId ? [partnerId] : undefined
  const result = await pool.query(
    `select ${columns.join(', ')}, updated_at from production_profiles${filter} order by updated_at desc`,
    values,
  )
  return result.rows.map((row) => mapProductionProfileRow(row as ProductionProfileRow))
}

export async function upsertProductionProfile(pool: DbPool, input: Partial<ProductionProfile>): Promise<ProductionProfile> {
  const profile = normalizeProductionProfileInput(input)
  const values = valuesFromProfile(profile)
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'partner_id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into production_profiles (${columns.join(', ')})
     values (${placeholders})
     on conflict (partner_id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, updated_at`,
    values,
  )
  return mapProductionProfileRow(result.rows[0] as ProductionProfileRow)
}

export function createPostgresProductionProfilesRepository(pool: DbPool) {
  return {
    list: (partnerId?: string) => listProductionProfiles(pool, partnerId),
    upsert: (profile: ProductionProfile) => upsertProductionProfile(pool, profile),
  }
}

function valuesFromProfile(profile: ProductionProfile) {
  return [
    profile.partnerId,
    profile.capabilities,
    profile.materials,
    profile.moq,
    profile.leadTime,
    profile.certifications,
    profile.costNotes,
    profile.qualityNotes,
    profile.readinessStatus,
    profile.readinessScore,
    profile.blocker,
  ]
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown) {
  return typeof value === 'number' ? value : Number(value)
}

function readinessScore(value: unknown) {
  const resolved = number(value)
  if (Number.isInteger(resolved) && resolved >= 0 && resolved <= 100) return resolved
  throw new HttpError('invalid_production_profile', 'Readiness score must be an integer from 0 to 100.', 400)
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_production_profile', message, 400)
}
