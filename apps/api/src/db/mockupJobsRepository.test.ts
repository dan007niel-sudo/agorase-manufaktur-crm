import { describe, expect, it } from 'vitest'
import {
  MOCKUP_MAX_REFERENCE_BYTES,
  type MockupJob,
  type MockupReference,
} from '@agorase/shared'
import {
  deleteMockupJob,
  getMockupJob,
  listMockupJobs,
  mapMockupJobRow,
  mapMockupReferencesValue,
  normalizeMockupJobInput,
  upsertMockupJob,
} from './mockupJobsRepository.js'

const sampleReference: MockupReference = {
  id: 'ref-1',
  name: 'inspo.png',
  data: 'aGVsbG8=',
  mimeType: 'image/png',
  kind: 'style',
}

const job: MockupJob = {
  id: 'mockup-1',
  prompt: 'A poetic SS27 capsule mockup.',
  referenceNotes: 'Margiela tonal references.',
  aspectRatio: '4:5',
  quality: 'standard',
  status: 'completed',
  modelUsed: 'gemini-3-pro-image-preview',
  imageUrl: 'https://example.test/image.png',
  imageData: '',
  mimeType: 'image/png',
  error: '',
  releaseId: 'drop-1',
  briefId: 'brief-1',
  notes: 'Initial pass',
  referenceImages: [sampleReference],
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('mockupJobsRepository', () => {
  it('maps rows to mockup jobs', () => {
    expect(mapMockupJobRow(rowFromJob(job))).toMatchObject({
      id: 'mockup-1',
      prompt: 'A poetic SS27 capsule mockup.',
      aspectRatio: '4:5',
      quality: 'standard',
      status: 'completed',
      imageUrl: 'https://example.test/image.png',
      briefId: 'brief-1',
      releaseId: 'drop-1',
      referenceImages: [sampleReference],
    })
  })

  it('round-trips reference images through row mapping', () => {
    const mapped = mapMockupJobRow(rowFromJob(job))
    expect(mapped.referenceImages).toEqual([sampleReference])
  })

  it('mapMockupReferencesValue defensively handles parsed array, JSON string, null, and malformed input', () => {
    expect(mapMockupReferencesValue([sampleReference])).toEqual([sampleReference])
    expect(mapMockupReferencesValue(JSON.stringify([sampleReference]))).toEqual([sampleReference])
    expect(mapMockupReferencesValue(null)).toEqual([])
    expect(mapMockupReferencesValue(undefined)).toEqual([])
    expect(mapMockupReferencesValue('not-json{{{')).toEqual([])
    expect(mapMockupReferencesValue(42)).toEqual([])
  })

  it('rejects mockup jobs without a prompt', () => {
    expect(() => normalizeMockupJobInput({ ...job, prompt: '' })).toThrow('Mockup prompt is required.')
  })

  it('rejects mockup jobs without an id', () => {
    expect(() => normalizeMockupJobInput({ ...job, id: '' })).toThrow('Mockup job id is required.')
  })

  it('rejects mockup jobs with an unknown aspect ratio', () => {
    expect(() =>
      normalizeMockupJobInput({ ...job, aspectRatio: '42:99' as MockupJob['aspectRatio'] }),
    ).toThrow('Invalid mockup aspect ratio.')
  })

  it('rejects mockup jobs with an unknown quality', () => {
    expect(() =>
      normalizeMockupJobInput({ ...job, quality: 'galaxy' as MockupJob['quality'] }),
    ).toThrow('Invalid mockup quality.')
  })

  it('rejects mockup jobs with an unknown status', () => {
    expect(() =>
      normalizeMockupJobInput({ ...job, status: 'mystery' as MockupJob['status'] }),
    ).toThrow('Invalid mockup status.')
  })

  it('rejects more than three reference images', () => {
    const refs: MockupReference[] = Array.from({ length: 4 }, (_, index) => ({
      ...sampleReference,
      id: `ref-${index}`,
    }))
    expect(() => normalizeMockupJobInput({ ...job, referenceImages: refs })).toThrow(
      /At most 3 reference images/,
    )
  })

  it('rejects oversized reference base64 payloads', () => {
    const big = 'A'.repeat(MOCKUP_MAX_REFERENCE_BYTES + 16)
    expect(() =>
      normalizeMockupJobInput({
        ...job,
        referenceImages: [{ ...sampleReference, data: big }],
      }),
    ).toThrow(/2 MB limit/)
  })

  it('rejects reference images with disallowed mime types', () => {
    expect(() =>
      normalizeMockupJobInput({
        ...job,
        referenceImages: [{ ...sampleReference, mimeType: 'image/gif' }],
      }),
    ).toThrow(/mime type is not allowed/)
  })

  it('rejects reference images with an invalid kind', () => {
    expect(() =>
      normalizeMockupJobInput({
        ...job,
        referenceImages: [{ ...sampleReference, kind: 'bogus' as MockupReference['kind'] }],
      }),
    ).toThrow(/kind is invalid/)
  })

  it('rejects reference images missing required fields', () => {
    expect(() =>
      normalizeMockupJobInput({
        ...job,
        referenceImages: [{ ...sampleReference, data: '' }],
      }),
    ).toThrow(/requires id, name, and data/)
  })

  it('lists jobs ordered by created_at desc', async () => {
    const pool = fakePool([{ rows: [rowFromJob(job)] }])

    await expect(listMockupJobs(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('from mockup_jobs')
    expect(pool.calls[0]?.sql).toContain('order by created_at desc')
  })

  it('filters listed jobs by status, brief, and release', async () => {
    const pool = fakePool([{ rows: [] }])

    await listMockupJobs(pool, { status: 'failed', briefId: 'brief-1', releaseId: 'drop-1' })

    expect(pool.calls[0]?.sql).toContain('where status = $1')
    expect(pool.calls[0]?.sql).toContain('and brief_id = $2')
    expect(pool.calls[0]?.sql).toContain('and release_id = $3')
    expect(pool.calls[0]?.values).toEqual(['failed', 'brief-1', 'drop-1'])
  })

  it('upserts and deletes jobs', async () => {
    const pool = fakePool([{ rows: [rowFromJob(job)] }, { rows: [] }])

    await upsertMockupJob(pool, job)
    await deleteMockupJob(pool, job.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[0]?.sql).toContain('reference_images')
    expect(pool.calls[1]).toMatchObject({ values: [job.id] })
  })

  it('serializes reference images as JSON when upserting', async () => {
    const pool = fakePool([{ rows: [rowFromJob(job)] }])
    await upsertMockupJob(pool, job)
    const values = pool.calls[0]?.values ?? []
    const referencesValue = values[values.length - 1]
    expect(typeof referencesValue).toBe('string')
    expect(JSON.parse(referencesValue as string)).toEqual([sampleReference])
  })

  it('gets a job by id', async () => {
    const pool = fakePool([{ rows: [rowFromJob(job)] }])

    await expect(getMockupJob(pool, 'mockup-1')).resolves.toMatchObject({ id: 'mockup-1' })
    expect(pool.calls[0]?.values).toEqual(['mockup-1'])
  })
})

type Row = Record<string, unknown>

function fakePool(results: Array<{ rows: Row[] }>) {
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

function rowFromJob(value: MockupJob): Row {
  return {
    id: value.id,
    prompt: value.prompt,
    reference_notes: value.referenceNotes,
    aspect_ratio: value.aspectRatio,
    quality: value.quality,
    status: value.status,
    model_used: value.modelUsed,
    image_url: value.imageUrl,
    image_data: value.imageData,
    mime_type: value.mimeType,
    error: value.error,
    release_id: value.releaseId,
    brief_id: value.briefId,
    notes: value.notes,
    reference_images: value.referenceImages,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
