// Defensive normalization for Gemini outputs.
// Ported from rhe-fashion-studio/src/lib/quality.ts.
// Rationale: AI text routes regularly return malformed shapes (capabilities as string,
// streetwearScore as quoted number, sources as object). Mapping straight into UI code
// caused runtime errors like `item.capabilities.slice(...).map is not a function`.
//
// Every helper coerces the raw value into a safe default. The output shape matches
// the shared `PartnerResearchSuggestion` so the route, the web client and the UI all
// agree on the contract.

import type {
  MockupImageMode,
  MockupProductMode,
  MockupQualityCheck,
  MockupQualityCheckStatus,
  MockupQualityReport,
  ResearchQualityGate,
  ResearchVerification,
  SourceLink,
  VerifiedField,
  VerificationStatus,
} from '@agorase/shared'

export function toText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number') return String(value)
  return fallback
}

export function toScore(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(1, Math.min(100, Math.round(number)))
}

export function toTextArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => toText(item, '')).filter(Boolean)
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => toTextArray(item))
      .filter(Boolean)
  }
  return []
}

export function toSources(value: unknown): SourceLink[] {
  const parsed = Array.isArray(value) ? value : []
  return parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const url = normalizeUrl(toText(record.url, ''))
      if (!url) return null
      return { title: toText(record.title, url), url }
    })
    .filter((item): item is SourceLink => Boolean(item))
}

/**
 * Returns the source URL that *actually* supports the given field value.
 *
 * RHE lesson: the old version returned the first source for any non-empty value, which
 * marked every email as verified just because some source link existed. The correct
 * heuristic: only return a source whose hostname matches the field value (the value's
 * domain appears in the source URL).
 */
export function findSupportingSource(value: string, sources: Array<{ url: string }>) {
  if (!value || !sources.length) return ''
  const lower = value.toLowerCase()
  const domainSource = sources.find((source) => {
    const domain = source.url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0] ?? ''
    if (!domain) return false
    return lower.includes(domain)
  })
  return domainSource?.url ?? ''
}

export function verifyField(
  value: string,
  kind: 'address' | 'website' | 'contactPage' | 'email' | 'phone' | 'contactPerson',
  sources: Array<{ url: string }>,
): VerifiedField {
  const normalized = value.trim()
  const lower = normalized.toLowerCase()
  const isMissing =
    !normalized || lower.includes('nicht verifiziert') || lower.includes('adresse nicht verifiziert')
  const sourceUrl = findSupportingSource(normalized, sources)
  let status: VerificationStatus = 'unverified'
  let confidence = 10
  let note = 'Nicht belastbar belegt.'

  if (!isMissing && sourceUrl) {
    status = 'verified'
    confidence = 88
    note = 'Wert ist mit einer Quelle verknüpft.'
  } else if (!isMissing) {
    status = 'partial'
    confidence = kind === 'website' || kind === 'contactPage' ? 70 : 45
    note =
      kind === 'website' || kind === 'contactPage'
        ? 'URL vorhanden, Quelle separat prüfen.'
        : 'Wert vorhanden, aber ohne eindeutige Quelle.'
  }

  return { value: normalized || 'nicht verifiziert', status, confidence, sourceUrl, note }
}

export interface ResearchScoreInputs {
  name: string
  country: string
  sources: SourceLink[]
  capabilities: string[]
  moq: string
  samplingSpeed: string
}

export function buildResearchQualityGate(
  item: ResearchScoreInputs,
  verification: ResearchVerification,
): ResearchQualityGate {
  const warnings: string[] = []
  let score = 20
  if (item.name && item.country) score += 10
  if (verification.address.status === 'verified') score += 15
  else warnings.push('Anschrift nicht sicher verifiziert.')
  if (verification.website.status !== 'unverified') score += 12
  else warnings.push('Keine offizielle Website gefunden.')
  if (verification.contactPage.status !== 'unverified') score += 10
  if (verification.email.status !== 'unverified' || verification.phone.status !== 'unverified') score += 12
  else warnings.push('Keine direkte E-Mail oder Telefonnummer belegt.')
  if (item.sources.length >= 2) score += 14
  else warnings.push('Zu wenige Quellen für belastbare Kontaktaufnahme.')
  if (item.capabilities.length >= 3) score += 8
  if (item.moq !== 'auf Anfrage' && item.samplingSpeed !== 'auf Anfrage') score += 9

  const finalScore = Math.max(1, Math.min(100, score))
  return {
    score: finalScore,
    status: scoreToQualityStatus(finalScore),
    summary:
      finalScore >= 75
        ? 'Guter Recherchekandidat mit brauchbaren Kontakt-/Quellendaten.'
        : finalScore >= 45
          ? 'Interessanter Kandidat, aber vor Outreach manuell prüfen.'
          : 'Nicht direkt kontaktieren, erst Daten verifizieren.',
    warnings,
  }
}

export function scoreToQualityStatus(score: number): MockupQualityCheckStatus {
  if (score >= 75) return 'ready'
  if (score >= 45) return 'review'
  return 'blocked'
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`
  return ''
}

// ---------------------------------------------------------------------------
// Mockup quality report
// ---------------------------------------------------------------------------

export interface MockupQualityHeuristicInput {
  productMode: MockupProductMode | ''
  imageMode: MockupImageMode | ''
  fabric: string
  placement: string
  prompt: string
  designText: string
  typographyDirection: string
}

export function buildFallbackMockupChecks(
  input: MockupQualityHeuristicInput,
): MockupQualityCheck[] {
  return [
    {
      label: 'Briefing-Spezifikation',
      status: input.fabric.toLowerCase().includes('gsm') && input.placement.length > 10 ? 'ready' : 'review',
      note: 'GSM, Placement und Print-Verfahren bestimmen die technische Nutzbarkeit.',
    },
    {
      label: 'Brand-Fit',
      status: input.prompt.length > 50 ? 'ready' : 'review',
      note: 'Markenton sollte explizit in Prompt oder Referenz stehen.',
    },
    {
      label: 'Typografie',
      status:
        input.typographyDirection.length > 12 && input.designText.length > 2 ? 'ready' : 'review',
      note: 'Schriftstil und exakter Text helfen gegen generische oder verzerrte Prints.',
    },
    {
      label: 'Produktmodus',
      status: input.imageMode === 'Tech Pack View' || input.imageMode === 'Ghost-Mannequin' ? 'ready' : 'review',
      note: 'Produktionstaugliche Modi sind leichter zu bewerten als Kampagnenbilder.',
    },
  ]
}

export function buildFallbackMockupReport(
  input: MockupQualityHeuristicInput,
): MockupQualityReport {
  const checks = buildFallbackMockupChecks(input)
  const score = averageCheckScore(checks)
  return {
    score,
    status: scoreToQualityStatus(score),
    summary:
      'Heuristischer Check auf Basis des Briefings. Bildanalyse konnte nicht ausgeführt werden.',
    checks,
    recommendations: [
      'Generiertes Bild visuell auf Textlesbarkeit, Fit, Stoff und Print-Skalierung prüfen.',
    ],
  }
}

export function normalizeMockupQualityReport(
  value: unknown,
  input: MockupQualityHeuristicInput,
): MockupQualityReport {
  const data = (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})
  const checks = normalizeQualityChecks(data.checks)
  const fallbackChecks = buildFallbackMockupChecks(input)
  const finalChecks = checks.length ? checks : fallbackChecks
  const score = toScore(data.score, averageCheckScore(finalChecks))
  return {
    score,
    status: toQualityCheckStatus(data.status, scoreToQualityStatus(score)),
    summary: toText(
      data.summary,
      score >= 75
        ? 'Mockup wirkt verwendbar, sollte aber visuell geprüft werden.'
        : 'Mockup braucht manuelle Prüfung.',
    ),
    checks: finalChecks,
    recommendations: toTextArray(data.recommendations).slice(0, 5),
  }
}

function normalizeQualityChecks(value: unknown): MockupQualityCheck[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 8).map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return {
      label: toText(record.label, 'Quality Check'),
      status: toQualityCheckStatus(record.status, 'review'),
      note: toText(record.note, ''),
    }
  })
}

function averageCheckScore(checks: MockupQualityCheck[]): number {
  if (!checks.length) return 55
  const total = checks.reduce(
    (sum, check) =>
      sum + (check.status === 'ready' ? 90 : check.status === 'review' ? 60 : 25),
    0,
  )
  return Math.round(total / checks.length)
}

function toQualityCheckStatus(
  value: unknown,
  fallback: MockupQualityCheckStatus,
): MockupQualityCheckStatus {
  return value === 'ready' || value === 'review' || value === 'blocked' ? value : fallback
}
