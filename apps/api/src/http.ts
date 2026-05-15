import type { ApiErrorBody } from '@agorase/shared'

const DEFAULT_ORIGIN = 'http://localhost:5173'
const MAX_JSON_BODY_BYTES = 100_000

export class HttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

export function resolveOrigin(request: Request, allowedOrigins: string[]) {
  const fallback = allowedOrigins[0] || DEFAULT_ORIGIN
  const origin = request.headers.get('origin')
  if (!origin) return fallback
  return allowedOrigins.includes(origin) ? origin : fallback
}

export function jsonResponse<T>(
  body: T,
  status = 200,
  origin = DEFAULT_ORIGIN,
  headers: Record<string, string> = {},
) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'vary': 'Origin',
      ...headers,
    },
  })
}

export function errorResponse(code: string, message: string, status = 400, origin = DEFAULT_ORIGIN) {
  const body: ApiErrorBody = { error: { code, message } }
  return jsonResponse(body, status, origin)
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentLengthHeader = request.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    throw new HttpError('request_too_large', 'Request body is too large.', 413)
  }

  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError('invalid_json', 'Request body must be valid JSON.', 400)
  }
}

export function safeHttpError(error: unknown, fallbackCode: string, fallbackMessage: string, fallbackStatus = 400) {
  if (error instanceof HttpError) return error
  return new HttpError(fallbackCode, fallbackMessage, fallbackStatus)
}
