import type { WebOpsItem } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import type { WebOpsItemListFilters } from '../db/webOpsItemsRepository.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface WebOpsItemsRepository {
  list(filters?: WebOpsItemListFilters): Promise<WebOpsItem[]>
  get(id: string): Promise<WebOpsItem | null>
  upsert(item: WebOpsItem): Promise<WebOpsItem>
  delete(id: string): Promise<void>
}

export async function webOpsRoute(request: Request, env: ApiEnv, repository: WebOpsItemsRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const itemId = decodeURIComponent(pathname.replace('/api/web-ops/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/web-ops') {
      const filters: WebOpsItemListFilters = {
        releaseId: url.searchParams.get('release') ?? url.searchParams.get('releaseId') ?? undefined,
        kind: url.searchParams.get('kind') ?? undefined,
        status: url.searchParams.get('status') ?? undefined,
      }
      return jsonResponse({ items: await repository.list(filters) }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/web-ops') {
      const body = await readJson<WebOpsItem>(request)
      return jsonResponse({ item: await repository.upsert(body) }, 200, origin)
    }

    if (pathname.startsWith('/api/web-ops/') && !itemId.includes('/')) {
      if (request.method === 'GET') {
        const item = await repository.get(itemId)
        if (!item) return errorResponse('web_ops_not_found', 'Web ops item not found.', 404, origin)
        return jsonResponse({ item }, 200, origin)
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        const body = await readJson<Partial<WebOpsItem>>(request)
        const existing = request.method === 'PATCH' ? await repository.get(itemId) : null
        const merged = (existing ? { ...existing, ...body } : body) as WebOpsItem
        return jsonResponse({ item: await repository.upsert({ ...merged, id: itemId }) }, 200, origin)
      }

      if (request.method === 'DELETE') {
        await repository.delete(itemId)
        return jsonResponse({}, 204, origin)
      }
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'web_ops_failed', 'Web ops request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
