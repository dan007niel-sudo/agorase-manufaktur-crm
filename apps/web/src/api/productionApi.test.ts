import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductionProfile, SampleRequest } from '@agorase/shared'
import {
  deleteSampleRequest,
  listProductionProfiles,
  listSampleRequests,
  saveProductionProfile,
  saveSampleRequest,
} from './productionApi'

afterEach(() => vi.restoreAllMocks())

const profile: ProductionProfile = {
  partnerId: 'atelier-forma',
  capabilities: 'Cut and sew, small batch',
  materials: 'Cotton twill',
  moq: '50 units',
  leadTime: '6 weeks',
  certifications: 'GOTS',
  costNotes: 'Sample 120 EUR',
  qualityNotes: 'Clean finishing',
  readinessStatus: 'review',
  readinessScore: 70,
  blocker: '',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const sample: SampleRequest = {
  id: 'sample-1',
  partnerId: 'atelier-forma',
  title: 'Overshirt sample',
  status: 'requested',
  requestedAt: '2026-05-15',
  targetDate: '2026-06-01',
  costEstimate: '120 EUR',
  notes: 'Use black twill.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('productionApi', () => {
  it('loads production profiles with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ profiles: [profile] }), { status: 200 }))

    await expect(listProductionProfiles()).resolves.toEqual([profile])

    expect(fetch).toHaveBeenCalledWith('/api/production/profiles', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('saves a production profile by encoded partner id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ profile }), { status: 200 }))

    await saveProductionProfile({ ...profile, partnerId: 'atelier/forma' })

    expect(fetch).toHaveBeenCalledWith(
      '/api/production/profiles/atelier%2Fforma',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
  })

  it('loads sample requests with an optional partner filter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ samples: [sample] }), { status: 200 }))

    await expect(listSampleRequests('atelier/forma')).resolves.toEqual([sample])

    expect(fetch).toHaveBeenCalledWith(
      '/api/production/samples?partnerId=atelier%2Fforma',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('saves and deletes sample requests with credentials', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ sample }), { status: 200 }))
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await saveSampleRequest(sample)
    await deleteSampleRequest(sample.id)

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/production/samples/sample-1',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/production/samples/sample-1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })
})
