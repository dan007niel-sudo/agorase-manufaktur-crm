import type {
  PartnerCategory,
  PartnerResearchRequest,
  PartnerResearchResponse,
  PartnerResearchSuggestion,
  ResearchVerification,
} from '@agorase/shared'
import { clampCount, partnerCategories } from '@agorase/shared'
import type { ApiEnv } from '../env.js'
import { HttpError } from '../http.js'
import {
  buildResearchQualityGate,
  toScore,
  toSources,
  toText,
  toTextArray,
  verifyField,
} from '../lib/quality.js'

export function hasGeminiConfig(env: ApiEnv) {
  return Boolean(env.geminiApiKey)
}

export function buildPartnerResearchPrompt(request: PartnerResearchRequest) {
  const categories = request.categories.length
    ? request.categories.join(', ')
    : 'European fashion production partners'
  const europe = request.europeFocus
    ? 'Strict Europe focus — only EU/EEA/UK/CH manufacturers. Reject non-European candidates.'
    : 'Prefer Europe but allow strong global partners when relevant.'
  return [
    `Find ${clampCount(request.count)} real clothing production partners for Agorase Fashion OS.`,
    `Categories: ${categories}.`,
    `Regions: ${request.regions || 'Europe with DACH focus'}.`,
    `Product focus: ${request.productFocus || 'premium clothing, capsule collections, sampling, small-batch production'}.`,
    `Price level: ${request.priceLevel}.`,
    europe,
    'For each suggestion include: name, category, city, region, country, website, contactPage, address, email, phone, social, contactPerson, products, source, nextStep, notes, confidence, rationale, sources (array of {title,url}).',
    'Find the official registered address and contact data. If a value is not verifiable from the linked sources, set it exactly to "nicht verifiziert" (or leave website/contactPage empty).',
    'Do not invent contact data. Return JSON only.',
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
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )

  if (!response.ok) {
    throw new HttpError('provider_unavailable', 'Partner research provider is temporarily unavailable.', 502)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ||
    '{"suggestions":[]}'

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new HttpError('provider_unavailable', 'Partner research provider is temporarily unavailable.', 502)
  }

  return normalizePartnerResearchResponse(parsed)
}

/**
 * Server-side quality gate for the research route.
 *
 * Ported from RHE — the previous version of this code shipped the raw Gemini JSON to the
 * web client. That meant any malformed field (capabilities as string, missing sources,
 * email without source) caused either runtime crashes (the `.slice().map` lesson in CLAUDE.md)
 * or silent false-verification of contact data. Here we coerce every field through a defensive
 * normalizer, attach per-field verification with `verifyField` (whose `findSupportingSource`
 * only marks a contact field verified if the source URL's domain matches the value), and emit
 * a `researchQuality` gate the UI can show as a Score badge.
 */
export function normalizePartnerResearchResponse(value: unknown): PartnerResearchResponse {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const rawSuggestions = Array.isArray(raw.suggestions) ? raw.suggestions : []
  const suggestions: PartnerResearchSuggestion[] = rawSuggestions.map((entry) =>
    normalizeSingleSuggestion(entry),
  )
  return { suggestions }
}

function normalizeSingleSuggestion(entry: unknown): PartnerResearchSuggestion {
  const data = (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {})
  const sources = toSources(data.sources)
  const name = toText(data.name, 'Unbenannte Manufaktur')
  const category = pickPartnerCategory(data.category)
  const country = toText(data.country, 'Unbekannt')
  const address = toText(data.address, 'nicht verifiziert')
  const website = toText(data.website, '')
  const contactPage = toText(data.contactPage, '')
  const email = toText(data.email, 'nicht verifiziert')
  const phone = toText(data.phone, 'nicht verifiziert')
  const contactPerson = toText(data.contactPerson, 'nicht verifiziert')
  const capabilities = toTextArray(data.products ?? data.capabilities)
  const moq = toText(data.moq, 'auf Anfrage')
  const samplingSpeed = toText(data.samplingSpeed, 'auf Anfrage')

  const verification: ResearchVerification = {
    address: verifyField(address, 'address', sources),
    website: verifyField(website, 'website', sources),
    contactPage: verifyField(contactPage, 'contactPage', sources),
    email: verifyField(email, 'email', sources),
    phone: verifyField(phone, 'phone', sources),
    contactPerson: verifyField(contactPerson, 'contactPerson', sources),
  }

  const researchQuality = buildResearchQualityGate(
    { name, country, sources, capabilities, moq, samplingSpeed },
    verification,
  )

  return {
    name,
    category,
    city: toText(data.city, ''),
    region: toText(data.region, ''),
    country,
    website,
    email,
    phone,
    social: toText(data.social, ''),
    contactPerson,
    products: toText(data.products, ''),
    score: toScore(data.score, researchQuality.score),
    source: toText(data.source, 'KI-Recherche'),
    nextStep: toText(data.nextStep, 'Website prüfen und Sampling-Anfrage senden.'),
    notes: toText(data.notes, ''),
    confidence: toScore(data.confidence, researchQuality.score),
    rationale: toText(data.rationale, ''),
    sources,
    contactPage,
    address,
    verification,
    researchQuality,
  }
}

function pickPartnerCategory(value: unknown): PartnerCategory {
  if (typeof value === 'string' && (partnerCategories as readonly string[]).includes(value)) {
    return value as PartnerCategory
  }
  return partnerCategories[0]
}
