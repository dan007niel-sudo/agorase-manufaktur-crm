import { slugify } from './crmUtils'
import type { Category, FitScore, Manufactory, Potential, PriceLevel, Priority } from './types'
import { categories } from './types'

export interface AiResearchCriteria {
  categories: Category[]
  regions: string
  productFocus: string
  priceLevel: PriceLevel | 'Alle'
  count: number
}

export interface AiResearchSource {
  title: string
  url: string
}

export interface AiResearchSuggestion {
  name: string
  contactPerson: string
  category: Category
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  products: string
  priceLevel: PriceLevel
  brandFit: FitScore
  cooperationPotential: Potential
  priority: Priority
  source: string
  nextStep: string
  notes: string
  confidence: number
  rationale: string
  sources: AiResearchSource[]
}

export const aiSuggestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          contactPerson: { type: 'string' },
          category: { type: 'string', enum: categories },
          city: { type: 'string' },
          region: { type: 'string' },
          country: { type: 'string' },
          website: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          social: { type: 'string' },
          products: { type: 'string' },
          priceLevel: { type: 'string', enum: ['Budget', 'Mittel', 'Premium', 'Luxus'] },
          brandFit: { type: 'string', enum: ['A', 'A-', 'B+', 'B', 'C'] },
          cooperationPotential: { type: 'string', enum: ['Hoch', 'Mittel', 'Niedrig'] },
          priority: { type: 'string', enum: ['A', 'A-', 'B', 'C'] },
          source: { type: 'string' },
          nextStep: { type: 'string' },
          notes: { type: 'string' },
          confidence: { type: 'number' },
          rationale: { type: 'string' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
              },
              required: ['title', 'url'],
            },
          },
        },
        required: [
          'name',
          'contactPerson',
          'category',
          'city',
          'region',
          'country',
          'website',
          'email',
          'phone',
          'social',
          'products',
          'priceLevel',
          'brandFit',
          'cooperationPotential',
          'priority',
          'source',
          'nextStep',
          'notes',
          'confidence',
          'rationale',
          'sources',
        ],
      },
    },
  },
  required: ['suggestions'],
} as const

export function buildAiResearchPrompt(criteria: AiResearchCriteria) {
  const selectedCategories = criteria.categories.length ? criteria.categories.join(', ') : categories.join(', ')
  const priceLevel = criteria.priceLevel === 'Alle' ? 'passendes Preisniveau' : criteria.priceLevel

  return [
    `Finde ${criteria.count} passende Fashion-Manufakturen, Labels, Ateliers oder Produktionspartner fuer Agorase.`,
    `Kategorien: ${selectedCategories}.`,
    `Regionen/Laender: ${criteria.regions || 'Europa mit Fokus DACH'}.`,
    `Fashion-Fokus: ${criteria.productFocus || 'hochwertige, kuratierbare Modeprodukte, Capsule Collections und Accessoires'}.`,
    `Preisniveau: ${priceLevel}.`,
    'Bewerte Markenfit, Kooperationspotenzial und Prioritaet fuer eine kuratierte Fashion-Plattform.',
    'Achte besonders auf Silhouette, Materialqualitaet, Produktionsmodell, Wholesale-Eignung, kleine Serien, Lookbook-/Line-Sheet-Tauglichkeit und Social-Media-Auftritt.',
    'Nutze Websuche fuer aktuelle Treffer. Gib nur reale, pruefbare Fashion-Akteure aus und setze Quellen-URLs.',
    'Wenn Kontaktdaten nicht sicher auffindbar sind, lasse die Felder leer statt zu raten.',
  ].join('\n')
}

export async function requestAiManufactories({
  criteria,
}: {
  criteria: AiResearchCriteria
}) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${apiBaseUrl}/api/research/partners/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      categories: criteria.categories,
      regions: criteria.regions,
      productFocus: criteria.productFocus,
      priceLevel: criteria.priceLevel,
      count: criteria.count,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Research request failed with status ${response.status}`)
  }

  return parseAiResearchResponse(await response.json())
}

export function parseAiResearchResponse(payload: unknown): AiResearchSuggestion[] {
  if (payload && typeof payload === 'object' && 'suggestions' in payload) {
    const suggestions = payload.suggestions
    return Array.isArray(suggestions) ? suggestions.map(normalizeSuggestion) : []
  }

  const text = extractOutputText(payload)
  if (!text) return []

  const parsed = JSON.parse(text) as { suggestions?: AiResearchSuggestion[] }
  return (parsed.suggestions ?? []).map(normalizeSuggestion)
}

export function suggestionToManufacture(suggestion: AiResearchSuggestion): Manufactory {
  const sources = suggestion.sources
    .filter((source) => source.url)
    .map((source) => `${source.title}: ${source.url}`)
    .join('\n')

  return {
    id: `ki-${slugify(suggestion.name)}`,
    name: suggestion.name,
    contactPerson: suggestion.contactPerson,
    category: suggestion.category,
    city: suggestion.city,
    region: suggestion.region,
    country: suggestion.country,
    website: suggestion.website,
    email: suggestion.email,
    phone: suggestion.phone,
    social: suggestion.social,
    products: suggestion.products,
    priceLevel: suggestion.priceLevel,
    brandFit: suggestion.brandFit,
    cooperationPotential: suggestion.cooperationPotential,
    status: 'Recherchiert',
    priority: suggestion.priority,
    source: suggestion.source || 'KI-Recherche',
    lastContact: '',
    nextFollowUp: '',
    nextStep: suggestion.nextStep || 'Line Sheet oder Wholesale-Kontakt prüfen',
    notes: [
      suggestion.notes,
      `KI-Begründung: ${suggestion.rationale}`,
      `KI-Konfidenz: ${suggestion.confidence}%`,
      sources ? `Quellen:\n${sources}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  }
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  if ('output_text' in payload && typeof payload.output_text === 'string') return payload.output_text

  const output = 'output' in payload ? payload.output : undefined
  if (!Array.isArray(output)) return ''

  for (const item of output) {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
        return content.text
      }
    }
  }

  return ''
}

function normalizeSuggestion(suggestion: AiResearchSuggestion): AiResearchSuggestion {
  return {
    ...suggestion,
    source: suggestion.source || 'KI-Recherche',
    nextStep: suggestion.nextStep || 'Line Sheet oder Wholesale-Kontakt prüfen',
    confidence: Math.max(0, Math.min(100, Number(suggestion.confidence) || 0)),
    sources: Array.isArray(suggestion.sources) ? suggestion.sources : [],
  }
}
