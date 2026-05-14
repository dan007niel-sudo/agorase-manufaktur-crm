import type { PartnerCategory } from './fashion'

export interface SourceLink {
  title: string
  url: string
}

export interface PartnerResearchRequest {
  categories: PartnerCategory[]
  regions: string
  productFocus: string
  priceLevel: 'Budget' | 'Mittel' | 'Premium' | 'Luxus' | 'Alle'
  count: number
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
}

export interface PartnerResearchResponse {
  suggestions: PartnerResearchSuggestion[]
}

export interface BrainstormRequest {
  brief: string
  audience: string
  constraints: string
}

export interface BrainstormResponse {
  directions: Array<{
    title: string
    concept: string
    productIdeas: string[]
    visualLanguage: string
    risks: string[]
  }>
}

export interface ImageGenerationRequest {
  prompt: string
  aspectRatio: '1:1' | '4:5' | '3:4' | '16:9'
  quality: 'draft' | 'high' | 'ultra'
  referenceAssetIds: string[]
}

export interface ImageGenerationResponse {
  status: 'queued' | 'completed' | 'failed'
  assetId?: string
  message: string
}
