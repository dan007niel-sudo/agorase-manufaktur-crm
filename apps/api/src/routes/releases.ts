import type { FashionRelease, ReleasePartnerLink, ReleaseTask } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface ReleasesRepository {
  list(): Promise<FashionRelease[]>
  upsert(release: FashionRelease): Promise<FashionRelease>
  delete(id: string): Promise<void>
}

export interface ReleaseTasksRepository {
  list(releaseId?: string): Promise<ReleaseTask[]>
  upsert(task: ReleaseTask): Promise<ReleaseTask>
  delete(id: string): Promise<void>
}

export interface ReleasePartnersRepository {
  list(releaseId?: string): Promise<ReleasePartnerLink[]>
  upsert(link: ReleasePartnerLink): Promise<ReleasePartnerLink>
  delete(releaseId: string, partnerId: string): Promise<void>
}

export async function releasesRoute(
  request: Request,
  env: ApiEnv,
  repositories: {
    releasesRepository: ReleasesRepository
    releaseTasksRepository: ReleaseTasksRepository
    releasePartnersRepository: ReleasePartnersRepository
  },
) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const releaseId = decodeURIComponent(pathname.replace('/api/releases/', ''))
  const taskId = decodeURIComponent(pathname.replace('/api/releases/tasks/', ''))
  const partnerPath = pathname.replace('/api/releases/partners/', '')
  const partnerSegments = partnerPath.split('/').map((segment) => decodeURIComponent(segment))

  try {
    if (request.method === 'GET' && pathname === '/api/releases') {
      return jsonResponse({ releases: await repositories.releasesRepository.list() }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/releases') {
      const body = await readJson<FashionRelease>(request)
      return jsonResponse({ release: await repositories.releasesRepository.upsert(body) }, 200, origin)
    }

    if (request.method === 'GET' && pathname === '/api/releases/tasks') {
      return jsonResponse(
        { tasks: await repositories.releaseTasksRepository.list(url.searchParams.get('releaseId') ?? undefined) },
        200,
        origin,
      )
    }

    if (request.method === 'POST' && pathname === '/api/releases/tasks') {
      const body = await readJson<ReleaseTask>(request)
      return jsonResponse({ task: await repositories.releaseTasksRepository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && pathname.startsWith('/api/releases/tasks/') && !taskId.includes('/')) {
      const body = await readJson<ReleaseTask>(request)
      return jsonResponse({ task: await repositories.releaseTasksRepository.upsert({ ...body, id: taskId }) }, 200, origin)
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/releases/tasks/') && !taskId.includes('/')) {
      await repositories.releaseTasksRepository.delete(taskId)
      return jsonResponse({}, 204, origin)
    }

    if (request.method === 'GET' && pathname === '/api/releases/partners') {
      return jsonResponse(
        { links: await repositories.releasePartnersRepository.list(url.searchParams.get('releaseId') ?? undefined) },
        200,
        origin,
      )
    }

    if (request.method === 'POST' && pathname === '/api/releases/partners') {
      const body = await readJson<ReleasePartnerLink>(request)
      return jsonResponse({ link: await repositories.releasePartnersRepository.upsert(body) }, 200, origin)
    }

    if (
      request.method === 'DELETE' &&
      pathname.startsWith('/api/releases/partners/') &&
      partnerSegments.length === 2 &&
      partnerSegments.every(Boolean)
    ) {
      await repositories.releasePartnersRepository.delete(partnerSegments[0], partnerSegments[1])
      return jsonResponse({}, 204, origin)
    }

    if (request.method === 'PUT' && pathname.startsWith('/api/releases/') && !releaseId.includes('/')) {
      const body = await readJson<FashionRelease>(request)
      return jsonResponse({ release: await repositories.releasesRepository.upsert({ ...body, id: releaseId }) }, 200, origin)
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/releases/') && !releaseId.includes('/')) {
      await repositories.releasesRepository.delete(releaseId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'releases_failed', 'Release request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
