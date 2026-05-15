import type { PartnerEvent } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface PartnerEventsRepository {
  list(partnerId?: string): Promise<PartnerEvent[]>
  upsert(event: PartnerEvent): Promise<PartnerEvent>
  update(id: string, patch: Partial<PartnerEvent>): Promise<PartnerEvent>
  delete(id: string): Promise<void>
}

export async function partnerEventsRoute(request: Request, env: ApiEnv, repository: PartnerEventsRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const eventId = decodeURIComponent(pathname.replace('/api/partner-events/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/partner-events') {
      return jsonResponse({ events: await repository.list(url.searchParams.get('partnerId') ?? undefined) }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/partner-events') {
      const body = await readJson<PartnerEvent>(request)
      return jsonResponse({ event: await repository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && eventId && !eventId.includes('/')) {
      const body = await readJson<Partial<PartnerEvent>>(request)
      return jsonResponse({ event: await repository.update(eventId, body) }, 200, origin)
    }

    if (request.method === 'DELETE' && eventId && !eventId.includes('/')) {
      await repository.delete(eventId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'partner_events_failed', 'Partner event request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
