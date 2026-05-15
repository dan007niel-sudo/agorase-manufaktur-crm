import type { PartnerEvaluation } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface PartnerEvaluationsRepository {
  list(partnerId?: string): Promise<PartnerEvaluation[]>
  upsert(evaluation: PartnerEvaluation): Promise<PartnerEvaluation>
  update(id: string, patch: Partial<PartnerEvaluation>): Promise<PartnerEvaluation>
  delete(id: string): Promise<void>
}

export async function partnerEvaluationsRoute(request: Request, env: ApiEnv, repository: PartnerEvaluationsRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const evaluationId = decodeURIComponent(pathname.replace('/api/partner-evaluations/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/partner-evaluations') {
      return jsonResponse({ evaluations: await repository.list(url.searchParams.get('partnerId') ?? undefined) }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/partner-evaluations') {
      const body = await readJson<PartnerEvaluation>(request)
      return jsonResponse({ evaluation: await repository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && evaluationId && !evaluationId.includes('/')) {
      const body = await readJson<Partial<PartnerEvaluation>>(request)
      return jsonResponse({ evaluation: await repository.update(evaluationId, body) }, 200, origin)
    }

    if (request.method === 'DELETE' && evaluationId && !evaluationId.includes('/')) {
      await repository.delete(evaluationId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'partner_evaluations_failed', 'Partner evaluation request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
