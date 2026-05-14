export interface ApiEnv {
  port: number
  geminiApiKey: string
  geminiTextModel: string
  geminiImageModel: string
  allowedOrigins: string[]
}

export function readEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): ApiEnv {
  return {
    port: Number(source.PORT || 8787),
    geminiApiKey: source.GEMINI_API_KEY || source.GOOGLE_API_KEY || '',
    geminiTextModel: source.GEMINI_TEXT_MODEL || 'gemini-2.5-pro',
    geminiImageModel: source.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview',
    allowedOrigins: (source.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }
}
