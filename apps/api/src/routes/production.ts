import type { ProductionProfile, SampleRequest } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface ProductionProfilesRepository {
  list(partnerId?: string): Promise<ProductionProfile[]>
  upsert(profile: ProductionProfile): Promise<ProductionProfile>
}

export interface SampleRequestsRepository {
  list(partnerId?: string): Promise<SampleRequest[]>
  upsert(sample: SampleRequest): Promise<SampleRequest>
  delete(id: string): Promise<void>
}

export async function productionRoute(
  request: Request,
  env: ApiEnv,
  repositories: {
    productionProfilesRepository: ProductionProfilesRepository
    sampleRequestsRepository: SampleRequestsRepository
  },
) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const profilePartnerId = decodeURIComponent(pathname.replace('/api/production/profiles/', ''))
  const sampleId = decodeURIComponent(pathname.replace('/api/production/samples/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/production/profiles') {
      return jsonResponse(
        { profiles: await repositories.productionProfilesRepository.list(url.searchParams.get('partnerId') ?? undefined) },
        200,
        origin,
      )
    }

    if (request.method === 'PUT' && pathname.startsWith('/api/production/profiles/') && !profilePartnerId.includes('/')) {
      const body = await readJson<ProductionProfile>(request)
      return jsonResponse(
        { profile: await repositories.productionProfilesRepository.upsert({ ...body, partnerId: profilePartnerId }) },
        200,
        origin,
      )
    }

    if (request.method === 'GET' && pathname === '/api/production/samples') {
      return jsonResponse(
        { samples: await repositories.sampleRequestsRepository.list(url.searchParams.get('partnerId') ?? undefined) },
        200,
        origin,
      )
    }

    if (request.method === 'POST' && pathname === '/api/production/samples') {
      const body = await readJson<SampleRequest>(request)
      return jsonResponse({ sample: await repositories.sampleRequestsRepository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && pathname.startsWith('/api/production/samples/') && !sampleId.includes('/')) {
      const body = await readJson<SampleRequest>(request)
      return jsonResponse({ sample: await repositories.sampleRequestsRepository.upsert({ ...body, id: sampleId }) }, 200, origin)
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/production/samples/') && !sampleId.includes('/')) {
      await repositories.sampleRequestsRepository.delete(sampleId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'production_failed', 'Production request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
