import type { PartnerCategory } from './fashion.js'

export interface SourceLink {
  title: string
  url: string
}

// RHE-derived: how confident we are about a specific contact field.
// 'verified' = there is a source whose domain matches the value (e.g. email host).
// 'partial'  = a plausible value is present but no matching source backs it.
// 'unverified' = field is empty or explicitly marked as "nicht verifiziert".
export type VerificationStatus = 'verified' | 'partial' | 'unverified'

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  'verified',
  'partial',
  'unverified',
]

export interface VerifiedField {
  value: string
  status: VerificationStatus
  confidence: number
  sourceUrl: string
  note: string
}

export interface ResearchVerification {
  address: VerifiedField
  website: VerifiedField
  contactPage: VerifiedField
  email: VerifiedField
  phone: VerifiedField
  contactPerson: VerifiedField
}

export type ResearchQualityStatus = 'ready' | 'review' | 'blocked'

export interface ResearchQualityGate {
  score: number
  status: ResearchQualityStatus
  summary: string
  warnings: string[]
}

export interface PartnerResearchRequest {
  categories: PartnerCategory[]
  regions: string
  productFocus: string
  priceLevel: 'Budget' | 'Mittel' | 'Premium' | 'Luxus' | 'Alle'
  count: number
  europeFocus?: boolean
}

export interface PartnerResearchSuggestion {
  name: string
  category: PartnerCategory
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  contactPerson: string
  products: string
  score: number
  source: string
  nextStep: string
  notes: string
  confidence: number
  rationale: string
  sources: SourceLink[]
  // RHE additions — defensive Zod-validated, always present on server response.
  contactPage: string
  address: string
  verification: ResearchVerification
  researchQuality: ResearchQualityGate
}

export interface PartnerResearchResponse {
  suggestions: PartnerResearchSuggestion[]
}
