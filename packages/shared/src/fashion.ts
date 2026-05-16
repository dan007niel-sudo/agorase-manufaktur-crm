export const fashionOsSections = [
  'Command Center',
  'Sourcing',
  'Partners',
  'Production',
  'Creative Lab',
  'Mockups',
  'Legal Orientation',
  'Releases',
  'Web Ops',
  'Settings'
] as const

export type FashionOsSection = (typeof fashionOsSections)[number]

export const partnerCategories = [
  'Factory',
  'Atelier',
  'Material Supplier',
  'Print & Finishing',
  'Pattern & Prototyping',
  'Label',
  'Packaging',
  'Logistics',
  'Showroom',
  'Agency'
] as const

export type PartnerCategory = (typeof partnerCategories)[number]

export const partnerStatuses = [
  'To Research',
  'Researched',
  'Contact Found',
  'Contacted',
  'Responded',
  'Call Planned',
  'Samples Requested',
  'In Review',
  'Approved Partner',
  'Rejected',
  'Revisit Later'
] as const

export type PartnerStatus = (typeof partnerStatuses)[number]

export type RiskLevel = 'low' | 'medium' | 'high'
export type ProviderStatus = 'ready' | 'missing_config' | 'error'

export interface Partner {
  id: string
  name: string
  category: PartnerCategory
  status: PartnerStatus
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  contactPerson: string
  source: string
  notes: string
  score: number
  nextStep: string
  nextFollowUp: string
}

export interface ProductionCapability {
  partnerId: string
  products: string[]
  materials: string[]
  moq: string
  leadTime: string
  sampleSupport: boolean
  certifications: string[]
}


export interface Release {
  id: string
  name: string
  season: string
  launchDate: string
  status: 'idea' | 'planning' | 'production' | 'content' | 'ready' | 'launched'
}
