import type { HealthResponse } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { jsonResponse, resolveOrigin } from '../http.js'
import { hasGeminiConfig } from '../providers/gemini.js'

export function healthRoute(request: Request, env: ApiEnv) {
  const body: HealthResponse = {
    ok: true,
    providers: {
      gemini: hasGeminiConfig(env) ? 'ready' : 'missing_config',
      image: hasGeminiConfig(env) ? 'ready' : 'missing_config',
    },
  }

  return jsonResponse(body, 200, resolveOrigin(request, env.allowedOrigins))
}
