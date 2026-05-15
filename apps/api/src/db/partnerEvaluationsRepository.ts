import type { PartnerEvaluation } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = ['id', 'partner_id', 'fit_score', 'quality_score', 'terms_score', 'risk_score', 'readiness_score', 'summary'] as const
type EvaluationRow = Record<string, unknown>

export function mapPartnerEvaluationRow(row: EvaluationRow): PartnerEvaluation {
  return {
    id: text(row.id),
    partnerId: text(row.partner_id),
    fitScore: number(row.fit_score),
    qualityScore: number(row.quality_score),
    termsScore: number(row.terms_score),
    riskScore: number(row.risk_score),
    readinessScore: number(row.readiness_score),
    summary: text(row.summary),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizePartnerEvaluationInput(input: Partial<PartnerEvaluation>): PartnerEvaluation {
  const now = new Date(0).toISOString()
  const evaluation: PartnerEvaluation = {
    id: text(input.id),
    partnerId: text(input.partnerId),
    fitScore: score(input.fitScore),
    qualityScore: score(input.qualityScore),
    termsScore: score(input.termsScore),
    riskScore: score(input.riskScore),
    readinessScore: score(input.readinessScore),
    summary: text(input.summary),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!evaluation.id) throw new HttpError('invalid_partner_evaluation', 'Partner evaluation id is required.', 400)
  if (!evaluation.partnerId) throw new HttpError('invalid_partner_evaluation', 'Partner id is required.', 400)
  return evaluation
}

export async function listPartnerEvaluations(pool: DbPool, partnerId = ''): Promise<PartnerEvaluation[]> {
  const filter = partnerId ? ' where partner_id = $1' : ''
  const values = partnerId ? [partnerId] : undefined
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from partner_evaluations${filter} order by updated_at desc`,
    values,
  )
  return result.rows.map((row) => mapPartnerEvaluationRow(row as EvaluationRow))
}

export async function upsertPartnerEvaluation(pool: DbPool, input: Partial<PartnerEvaluation>): Promise<PartnerEvaluation> {
  const evaluation = normalizePartnerEvaluationInput(input)
  const values = [
    evaluation.id,
    evaluation.partnerId,
    evaluation.fitScore,
    evaluation.qualityScore,
    evaluation.termsScore,
    evaluation.riskScore,
    evaluation.readinessScore,
    evaluation.summary,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into partner_evaluations (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapPartnerEvaluationRow(result.rows[0] as EvaluationRow)
}

export async function updatePartnerEvaluation(
  pool: DbPool,
  id: string,
  patch: Partial<PartnerEvaluation>,
): Promise<PartnerEvaluation> {
  const current = await pool.query(`select ${columns.join(', ')}, created_at, updated_at from partner_evaluations where id = $1`, [id])
  if (!current.rows[0] && !patch.id) {
    throw new HttpError('partner_evaluation_not_found', 'Partner evaluation not found.', 404)
  }
  return upsertPartnerEvaluation(pool, {
    ...(current.rows[0] ? mapPartnerEvaluationRow(current.rows[0] as EvaluationRow) : {}),
    ...patch,
    id,
  })
}

export async function deletePartnerEvaluation(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from partner_evaluations where id = $1', [id])
}

export function createPostgresPartnerEvaluationsRepository(pool: DbPool) {
  return {
    list: (partnerId?: string) => listPartnerEvaluations(pool, partnerId),
    upsert: (evaluation: PartnerEvaluation) => upsertPartnerEvaluation(pool, evaluation),
    update: (id: string, patch: Partial<PartnerEvaluation>) => updatePartnerEvaluation(pool, id, patch),
    delete: (id: string) => deletePartnerEvaluation(pool, id),
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown) {
  return typeof value === 'number' ? value : Number(value)
}

function score(value: unknown) {
  const resolved = number(value)
  if (Number.isInteger(resolved) && resolved >= 1 && resolved <= 5) return resolved
  throw new HttpError('invalid_partner_evaluation', 'Evaluation scores must be integers from 1 to 5.', 400)
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}
