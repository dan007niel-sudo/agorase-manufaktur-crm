import type { BrainstormResponse } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { jsonResponse, resolveOrigin } from '../http.js'

export async function visualizeRoute(request: Request, env: ApiEnv) {
  const body: BrainstormResponse & { message: string } = {
    directions: [],
    message: 'Creative visualization is wired through the secure API boundary and awaits provider implementation.',
  }

  return jsonResponse(body, 200, resolveOrigin(request, env.allowedOrigins))
}
