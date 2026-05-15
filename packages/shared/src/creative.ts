export type CreativeBriefStatus =
  | 'draft'
  | 'exploring'
  | 'directions-saved'
  | 'approved'
  | 'archived'

export const CREATIVE_BRIEF_STATUSES: readonly CreativeBriefStatus[] = [
  'draft',
  'exploring',
  'directions-saved',
  'approved',
  'archived',
]

export type CreativeDirectionSource = 'ai' | 'manual'

export const CREATIVE_DIRECTION_SOURCES: readonly CreativeDirectionSource[] = ['ai', 'manual']

export interface CreativeBrief {
  id: string
  title: string
  goal: string
  audience: string
  tone: string
  references: string
  season: string
  releaseId: string
  status: CreativeBriefStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreativeBriefInput {
  id: string
  title: string
  goal?: string
  audience?: string
  tone?: string
  references?: string
  season?: string
  releaseId?: string
  status?: CreativeBriefStatus
  notes?: string
}

export interface CreativeDirection {
  id: string
  briefId: string
  title: string
  summary: string
  body: string
  keywords: string
  palette: string
  materials: string
  silhouettes: string
  promptUsed: string
  modelUsed: string
  source: CreativeDirectionSource
  saved: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreativeDirectionInput {
  id: string
  briefId: string
  title: string
  summary?: string
  body?: string
  keywords?: string
  palette?: string
  materials?: string
  silhouettes?: string
  promptUsed?: string
  modelUsed?: string
  source?: CreativeDirectionSource
  saved?: boolean
  notes?: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface PromptTemplateInput {
  id: string
  name: string
  description?: string
  category?: string
  body: string
}

export interface BrainstormRequest {
  brief_id?: string
  prompt: string
  template_id?: string
  count?: number
}

export interface BrainstormResponse {
  directions: CreativeDirection[]
  model: string
  prompt: string
}

export interface CreativeBriefsResponse {
  briefs: CreativeBrief[]
}

export interface CreativeBriefResponse {
  brief: CreativeBrief
}

export interface CreativeDirectionsResponse {
  directions: CreativeDirection[]
}

export interface CreativeDirectionResponse {
  direction: CreativeDirection
}

export interface PromptTemplatesResponse {
  templates: PromptTemplate[]
}

export interface PromptTemplateResponse {
  template: PromptTemplate
}
