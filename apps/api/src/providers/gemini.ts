import type { PartnerResearchRequest, PartnerResearchResponse } from '@agorase/shared'
import { clampCount } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { HttpError } from '../http.js'

export function hasGeminiConfig(env: ApiEnv) {
  return Boolean(env.geminiApiKey)
}

export function buildPartnerResearchPrompt(request: PartnerResearchRequest) {
  const categories = request.categories.length ? request.categories.join(', ') : 'European fashion production partners'
  return [
    `Find ${clampCount(request.count)} real European clothing production partners for Agorase Fashion OS.`,
    `Categories: ${categories}.`,
    `Regions: ${request.regions || 'Europe with DACH focus'}.`,
    `Product focus: ${request.productFocus || 'premium clothing, capsule collections, sampling, small-batch production'}.`,
    `Price level: ${request.priceLevel}.`,
    'Return JSON only with a suggestions array and source links. Do not invent contact data.',
  ].join('\n')
}

export async function researchPartnersWithGemini(
  env: ApiEnv,
  request: PartnerResearchRequest,
): Promise<PartnerResearchResponse> {
  if (!hasGeminiConfig(env)) {
    throw new HttpError('research_failed', 'AI provider is not configured.', 503)
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiTextModel)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPartnerResearchPrompt(request) }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) {
    throw new HttpError('provider_unavailable', 'Partner research provider is temporarily unavailable.', 502)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || '{"suggestions":[]}'

  try {
    return JSON.parse(text) as PartnerResearchResponse
  } catch {
    throw new HttpError('provider_unavailable', 'Partner research provider is temporarily unavailable.', 502)
  }
}
