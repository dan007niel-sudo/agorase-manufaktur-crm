import type { PartnerResearchRequest } from '@agorase/shared'
import { clampCount, partnerCategories } from '@agorase/shared'
import type { PartnerCategory } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'
import { researchPartnersWithGemini } from '../providers/gemini.js'

const priceLevels: PartnerResearchRequest['priceLevel'][] = ['Budget', 'Mittel', 'Premium', 'Luxus', 'Alle']
const MAX_TEXT_LENGTH = 500

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : ''
}

function normalizeResearchRequest(body: Partial<PartnerResearchRequest>): PartnerResearchRequest {
  return {
    categories: Array.isArray(body.categories)
      ? body.categories.filter((category): category is PartnerCategory =>
          partnerCategories.includes(category as PartnerCategory),
        )
      : [],
    regions: normalizeText(body.regions),
    productFocus: normalizeText(body.productFocus),
    priceLevel: priceLevels.includes(body.priceLevel ?? 'Alle') ? (body.priceLevel ?? 'Alle') : 'Alle',
    count: clampCount(Number(body.count)),
    europeFocus: typeof body.europeFocus === 'boolean' ? body.europeFocus : false,
  }
}

export async function researchRoute(request: Request, env: ApiEnv) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  try {
    const body = await readJson<Partial<PartnerResearchRequest>>(request)
    const normalized = normalizeResearchRequest(body)
    const result = await researchPartnersWithGemini(env, normalized)
    return jsonResponse(result, 200, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'research_failed', 'Partner research failed.')
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
