import {
  MOCKUP_ALLOWED_REFERENCE_MIME_TYPES,
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_IMAGE_MODES,
  MOCKUP_JOB_STATUSES,
  MOCKUP_MAX_REFERENCES,
  MOCKUP_MAX_REFERENCE_BYTES,
  MOCKUP_PRODUCT_MODES,
  MOCKUP_QUALITIES,
  MOCKUP_REFERENCE_KINDS,
  type MockupImageMode,
  type MockupJob,
  type MockupPrintFields,
  type MockupProductMode,
  type MockupQualityReport,
  type MockupReference,
  type MockupReferenceKind,
} from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = [
  'id',
  'prompt',
  'reference_notes',
  'aspect_ratio',
  'quality',
  'status',
  'model_used',
  'image_url',
  'image_data',
  'mime_type',
  'error',
  'release_id',
  'brief_id',
  'notes',
  'reference_images',
  'product_mode',
  'image_mode',
  'garment_color',
  'fabric',
  'print_method',
  'placement',
  'design_text',
  'typography_preset',
  'typography_freeform',
  'print_fields',
  'quality_report',
] as const

type Row = Record<string, unknown>

export interface MockupJobListFilters {
  status?: string
  briefId?: string
  releaseId?: string
}

export function mapMockupJobRow(row: Row): MockupJob {
  return {
    id: text(row.id),
    prompt: text(row.prompt),
    referenceNotes: text(row.reference_notes),
    aspectRatio: text(row.aspect_ratio) as MockupJob['aspectRatio'],
    quality: text(row.quality) as MockupJob['quality'],
    status: text(row.status) as MockupJob['status'],
    modelUsed: text(row.model_used),
    imageUrl: text(row.image_url),
    imageData: text(row.image_data),
    mimeType: text(row.mime_type),
    error: text(row.error),
    releaseId: text(row.release_id),
    briefId: text(row.brief_id),
    notes: text(row.notes),
    referenceImages: mapMockupReferencesValue(row.reference_images),
    productMode: optionalEnum(row.product_mode, MOCKUP_PRODUCT_MODES),
    imageMode: optionalEnum(row.image_mode, MOCKUP_IMAGE_MODES),
    garmentColor: text(row.garment_color),
    fabric: text(row.fabric),
    printMethod: text(row.print_method),
    placement: text(row.placement),
    designText: text(row.design_text),
    typographyPreset: text(row.typography_preset),
    typographyFreeform: text(row.typography_freeform),
    printFields: mapPrintFieldsValue(row.print_fields),
    qualityReport: mapQualityReportValue(row.quality_report),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  if (typeof value !== 'string') return ''
  return (allowed as readonly string[]).includes(value) ? (value as T) : ''
}

function mapPrintFieldsValue(value: unknown): MockupPrintFields {
  const fallback: MockupPrintFields = { front: '', back: '', sleeve: '', printSizeCm: '' }
  if (!value) return fallback
  const raw = typeof value === 'string' ? safeJson(value) : value
  if (!raw || typeof raw !== 'object') return fallback
  const record = raw as Record<string, unknown>
  return {
    front: text(record.front),
    back: text(record.back),
    sleeve: text(record.sleeve),
    printSizeCm: text(record.printSizeCm),
  }
}

function mapQualityReportValue(value: unknown): MockupQualityReport | null {
  if (!value) return null
  const raw = typeof value === 'string' ? safeJson(value) : value
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const score = Number(record.score)
  if (!Number.isFinite(score)) return null
  const status = record.status
  const statusOk =
    status === 'ready' || status === 'review' || status === 'blocked' ? status : 'review'
  const checks: MockupQualityReport['checks'] = Array.isArray(record.checks)
    ? record.checks
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => {
          const status =
            entry.status === 'ready' || entry.status === 'review' || entry.status === 'blocked'
              ? (entry.status as 'ready' | 'review' | 'blocked')
              : ('review' as const)
          return {
            label: typeof entry.label === 'string' ? entry.label : 'Quality Check',
            status,
            note: typeof entry.note === 'string' ? entry.note : '',
          }
        })
    : []
  const recommendations = Array.isArray(record.recommendations)
    ? record.recommendations.filter((entry): entry is string => typeof entry === 'string')
    : []
  return {
    score: Math.max(1, Math.min(100, Math.round(score))),
    status: statusOk,
    summary: typeof record.summary === 'string' ? record.summary : '',
    checks,
    recommendations,
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function mapMockupReferencesValue(value: unknown): MockupReference[] {
  if (Array.isArray(value)) return shapeReferences(value)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return shapeReferences(parsed)
    } catch {
      return []
    }
  }
  return []
}

function shapeReferences(value: unknown[]): MockupReference[] {
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry.id),
      name: text(entry.name),
      data: typeof entry.data === 'string' ? entry.data : '',
      mimeType: text(entry.mimeType),
      kind: (typeof entry.kind === 'string' && (MOCKUP_REFERENCE_KINDS as readonly string[]).includes(entry.kind)
        ? entry.kind
        : 'reference') as MockupReferenceKind,
    }))
    .filter((entry) => entry.id && entry.name && entry.data)
}

export function normalizeMockupJobInput(input: Partial<MockupJob>): MockupJob {
  const now = new Date(0).toISOString()
  const value: MockupJob = {
    id: text(input.id),
    prompt: text(input.prompt),
    referenceNotes: text(input.referenceNotes),
    aspectRatio: oneOf(input.aspectRatio ?? '1:1', MOCKUP_ASPECT_RATIOS, 'Invalid mockup aspect ratio.'),
    quality: oneOf(input.quality ?? 'standard', MOCKUP_QUALITIES, 'Invalid mockup quality.'),
    status: oneOf(input.status ?? 'pending', MOCKUP_JOB_STATUSES, 'Invalid mockup status.'),
    modelUsed: text(input.modelUsed),
    imageUrl: text(input.imageUrl),
    imageData: typeof input.imageData === 'string' ? input.imageData : '',
    mimeType: text(input.mimeType),
    error: text(input.error),
    releaseId: text(input.releaseId),
    briefId: text(input.briefId),
    notes: text(input.notes),
    referenceImages: validateReferenceImages(input.referenceImages),
    productMode: optionalInputEnum<MockupProductMode>(
      input.productMode,
      MOCKUP_PRODUCT_MODES,
      'Invalid mockup product mode.',
    ),
    imageMode: optionalInputEnum<MockupImageMode>(
      input.imageMode,
      MOCKUP_IMAGE_MODES,
      'Invalid mockup image mode.',
    ),
    garmentColor: text(input.garmentColor),
    fabric: text(input.fabric),
    printMethod: text(input.printMethod),
    placement: text(input.placement),
    designText: text(input.designText),
    typographyPreset: text(input.typographyPreset),
    typographyFreeform: text(input.typographyFreeform),
    printFields: normalizePrintFieldsInput(input.printFields),
    qualityReport: input.qualityReport ?? null,
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) throw new HttpError('invalid_mockup_job', 'Mockup job id is required.', 400)
  if (!value.prompt) throw new HttpError('invalid_mockup_job', 'Mockup prompt is required.', 400)
  return value
}

function optionalInputEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  message: string,
): T | '' {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T
  }
  throw new HttpError('invalid_mockup_job', message, 400)
}

function normalizePrintFieldsInput(value: unknown): MockupPrintFields {
  if (!value || typeof value !== 'object') {
    return { front: '', back: '', sleeve: '', printSizeCm: '' }
  }
  const record = value as Record<string, unknown>
  return {
    front: text(record.front),
    back: text(record.back),
    sleeve: text(record.sleeve),
    printSizeCm: text(record.printSizeCm),
  }
}

function validateReferenceImages(value: unknown): MockupReference[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw new HttpError('invalid_mockup_job', 'Reference images must be an array.', 400)
  }
  if (value.length > MOCKUP_MAX_REFERENCES) {
    throw new HttpError(
      'invalid_mockup_job',
      `At most ${MOCKUP_MAX_REFERENCES} reference images are allowed.`,
      400,
    )
  }
  return value.map((entry, index) => validateSingleReference(entry, index))
}

function validateSingleReference(entry: unknown, index: number): MockupReference {
  if (!entry || typeof entry !== 'object') {
    throw new HttpError('invalid_mockup_job', `Reference image #${index + 1} is invalid.`, 400)
  }
  const record = entry as Record<string, unknown>
  const id = text(record.id)
  const name = text(record.name)
  const data = typeof record.data === 'string' ? record.data : ''
  const mimeType = text(record.mimeType)
  const kindValue = typeof record.kind === 'string' ? record.kind : ''
  if (!id || !name || !data) {
    throw new HttpError(
      'invalid_mockup_job',
      `Reference image #${index + 1} requires id, name, and data.`,
      400,
    )
  }
  if (!(MOCKUP_ALLOWED_REFERENCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new HttpError(
      'invalid_mockup_job',
      `Reference image #${index + 1} mime type is not allowed.`,
      400,
    )
  }
  if (!(MOCKUP_REFERENCE_KINDS as readonly string[]).includes(kindValue)) {
    throw new HttpError(
      'invalid_mockup_job',
      `Reference image #${index + 1} kind is invalid.`,
      400,
    )
  }
  if (Buffer.byteLength(data, 'utf8') > MOCKUP_MAX_REFERENCE_BYTES) {
    throw new HttpError(
      'invalid_mockup_job',
      `Reference image #${index + 1} exceeds the 2 MB limit.`,
      400,
    )
  }
  return { id, name, data, mimeType, kind: kindValue as MockupReferenceKind }
}

export async function listMockupJobs(
  pool: DbPool,
  filters: MockupJobListFilters = {},
): Promise<MockupJob[]> {
  const where: string[] = []
  const values: unknown[] = []
  if (filters.status) {
    values.push(filters.status)
    where.push(`status = $${values.length}`)
  }
  if (filters.briefId) {
    values.push(filters.briefId)
    where.push(`${where.length ? 'and ' : ''}brief_id = $${values.length}`)
  }
  if (filters.releaseId) {
    values.push(filters.releaseId)
    where.push(`${where.length ? 'and ' : ''}release_id = $${values.length}`)
  }
  const filter = where.length ? ` where ${where.join(' ')}` : ''
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from mockup_jobs${filter} order by created_at desc`,
    values.length ? values : undefined,
  )
  return result.rows.map((row) => mapMockupJobRow(row as Row))
}

export async function upsertMockupJob(pool: DbPool, input: Partial<MockupJob>): Promise<MockupJob> {
  const job = normalizeMockupJobInput(input)
  const values = [
    job.id,
    job.prompt,
    job.referenceNotes,
    job.aspectRatio,
    job.quality,
    job.status,
    job.modelUsed,
    job.imageUrl,
    job.imageData,
    job.mimeType,
    job.error,
    job.releaseId,
    job.briefId,
    job.notes,
    JSON.stringify(job.referenceImages),
    job.productMode,
    job.imageMode,
    job.garmentColor,
    job.fabric,
    job.printMethod,
    job.placement,
    job.designText,
    job.typographyPreset,
    job.typographyFreeform,
    JSON.stringify(job.printFields),
    job.qualityReport ? JSON.stringify(job.qualityReport) : null,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into mockup_jobs (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapMockupJobRow(result.rows[0] as Row)
}

export async function getMockupJob(pool: DbPool, id: string): Promise<MockupJob | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from mockup_jobs where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapMockupJobRow(row as Row) : null
}

export async function deleteMockupJob(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from mockup_jobs where id = $1', [id])
}

export function createPostgresMockupJobsRepository(pool: DbPool) {
  return {
    list: (filters?: MockupJobListFilters) => listMockupJobs(pool, filters),
    get: (id: string) => getMockupJob(pool, id),
    upsert: (job: MockupJob) => upsertMockupJob(pool, job),
    delete: (id: string) => deleteMockupJob(pool, id),
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_mockup_job', message, 400)
}
