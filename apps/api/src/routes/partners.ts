import type { Manufactory } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface PartnersRepository {
  list(): Promise<Manufactory[]>
  upsert(partner: Manufactory): Promise<Manufactory>
  update(id: string, patch: Partial<Manufactory>): Promise<Manufactory>
  delete(id: string): Promise<void>
  importMany(partners: Manufactory[]): Promise<Manufactory[]>
}

export async function partnersRoute(request: Request, env: ApiEnv, repository: PartnersRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const partnerId = decodeURIComponent(pathname.replace('/api/partners/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/partners') {
      return jsonResponse({ partners: await repository.list() }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/partners/import') {
      const body = await readJson<{ partners?: Manufactory[] }>(request)
      return jsonResponse({ partners: await repository.importMany(body.partners ?? []) }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/partners') {
      const body = await readJson<Manufactory>(request)
      return jsonResponse({ partner: await repository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && partnerId && !partnerId.includes('/')) {
      const body = await readJson<Partial<Manufactory>>(request)
      return jsonResponse({ partner: await repository.update(partnerId, body) }, 200, origin)
    }

    if (request.method === 'DELETE' && partnerId && !partnerId.includes('/')) {
      await repository.delete(partnerId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'partners_failed', 'Partner request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
