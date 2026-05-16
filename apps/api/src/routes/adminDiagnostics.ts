import type { AdminDiagnostics } from '@agorase/shared'
import type { ApiContext } from '../index.js'
import type { DbPool } from '../db/client.js'
import { errorResponse, jsonResponse, resolveOrigin } from '../http.js'
import { hasGeminiConfig } from '../providers/gemini.js'

export async function adminDiagnosticsRoute(request: Request, context: ApiContext) {
  const env = context.env
  const origin = resolveOrigin(request, env.allowedOrigins)

  if (request.method !== 'GET') {
    return errorResponse('method_not_allowed', 'Method not allowed.', 405, origin)
  }

  const providerStatus = hasGeminiConfig(env) ? 'ready' : 'not_configured'
  const databaseStatus = await pingDatabase(context.pool)

  const body: AdminDiagnostics = {
    checkedAt: new Date().toISOString(),
    providers: {
      geminiText: providerStatus,
      geminiImage: providerStatus,
      database: databaseStatus,
    },
    env: {
      geminiTextModel: env.geminiTextModel,
      geminiImageModel: env.geminiImageModel,
      allowedOriginsCount: env.allowedOrigins.length,
    },
    deployment: {
      nodeEnv: env.nodeEnv,
    },
  }

  return jsonResponse(body, 200, origin)
}

async function pingDatabase(pool: DbPool | undefined): Promise<'ready' | 'unavailable'> {
  if (!pool) return 'unavailable'
  try {
    await pool.query('SELECT 1')
    return 'ready'
  } catch {
    return 'unavailable'
  }
}
