import type { OperationalTask } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'

export interface TasksRepository {
  list(): Promise<OperationalTask[]>
  upsert(task: OperationalTask): Promise<OperationalTask>
  update(id: string, patch: Partial<OperationalTask>): Promise<OperationalTask>
  delete(id: string): Promise<void>
}

export async function tasksRoute(request: Request, env: ApiEnv, repository: TasksRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '')
  const taskId = decodeURIComponent(pathname.replace('/api/tasks/', ''))

  try {
    if (request.method === 'GET' && pathname === '/api/tasks') {
      return jsonResponse({ tasks: await repository.list() }, 200, origin)
    }

    if (request.method === 'POST' && pathname === '/api/tasks') {
      const body = await readJson<OperationalTask>(request)
      return jsonResponse({ task: await repository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && taskId && !taskId.includes('/')) {
      const body = await readJson<Partial<OperationalTask>>(request)
      return jsonResponse({ task: await repository.update(taskId, body) }, 200, origin)
    }

    if (request.method === 'DELETE' && taskId && !taskId.includes('/')) {
      await repository.delete(taskId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'tasks_failed', 'Task request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
