export const categories = [
  'Ready-to-Wear',
  'Streetwear',
  'Outerwear',
  'Denim',
  'Knitwear',
  'Tailoring',
  'Lederwaren',
  'Schuhe',
  'Taschen',
  'Schmuck',
  'Eyewear',
  'Textilien & Stoffe',
  'Print & Veredelung',
  'Schnitt & Prototyping',
  'Sustainable Fashion',
] as const

export const pipelineStatuses = [
  'Zu recherchieren',
  'Recherchiert',
  'Kontakt gefunden',
  'Erstkontakt gesendet',
  'Antwort erhalten',
  'Gespräch geplant',
  'Line Sheet / Samples angefragt',
  'Kooperation in Prüfung',
  'Aufgenommen',
  'Abgelehnt',
  'Später erneut kontaktieren',
] as const

export type Category = (typeof categories)[number]
export type PipelineStatus = (typeof pipelineStatuses)[number]
export type PriceLevel = 'Budget' | 'Mittel' | 'Premium' | 'Luxus'
export type FitScore = 'A' | 'A-' | 'B+' | 'B' | 'C'
export type Potential = 'Hoch' | 'Mittel' | 'Niedrig'
export type Priority = 'A' | 'A-' | 'B' | 'C'

export interface Manufactory {
  id: string
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
  status: PipelineStatus
  priority: Priority
  source: string
  lastContact: string
  nextFollowUp: string
  nextStep: string
  notes: string
}

export interface CrmTask {
  id: string
  manufactureId: string
  title: string
  dueDate: string
  urgency: 'overdue' | 'today' | 'upcoming'
  completed: boolean
}

export interface Metrics {
  total: number
  highFit: number
  highPotential: number
  contacted: number
  dueFollowUps: number
  openTasks: number
}

export interface Template {
  id: string
  name: string
  subject: string
  body: string
}

export interface PartnersResponse {
  partners: Manufactory[]
}

export interface PartnerResponse {
  partner: Manufactory
}

export interface PartnerImportRequest {
  partners: Manufactory[]
}
