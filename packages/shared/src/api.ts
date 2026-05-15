import type { ProviderStatus } from './fashion.js'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface HealthResponse {
  ok: boolean
  providers: {
    gemini: ProviderStatus
    image: ProviderStatus
  }
}

export interface AuthSessionResponse {
  authenticated: boolean
}

export function clampCount(value: number, min = 1, max = 20) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}
