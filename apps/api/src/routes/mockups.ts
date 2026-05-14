import type { ImageGenerationResponse } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { jsonResponse, resolveOrigin } from '../http.js'

export async function mockupsRoute(request: Request, env: ApiEnv) {
  const body: ImageGenerationResponse = {
    status: 'queued',
    message: `Image generation is configured for server-side provider routing via ${env.geminiImageModel}.`,
  }

  return jsonResponse(body, 202, resolveOrigin(request, env.allowedOrigins))
}
