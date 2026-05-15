import type { FashionOsSection } from './fashion.js'

export type OperationalTaskStatus = 'open' | 'done'
export type OperationalPriority = 'low' | 'medium' | 'high'
export type PartnerEventType = 'note' | 'email' | 'call' | 'meeting' | 'follow_up' | 'sample'

export interface OperationalTask {
  id: string
  title: string
  section: FashionOsSection
  status: OperationalTaskStatus
  priority: OperationalPriority
  partnerId: string
  dueDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PartnerEvent {
  id: string
  partnerId: string
  type: PartnerEventType
  title: string
  body: string
  eventDate: string
  nextAction: string
  createdAt: string
  updatedAt: string
}

export interface PartnerEvaluation {
  id: string
  partnerId: string
  fitScore: number
  qualityScore: number
  termsScore: number
  riskScore: number
  readinessScore: number
  summary: string
  createdAt: string
  updatedAt: string
}

export interface TasksResponse {
  tasks: OperationalTask[]
}

export interface TaskResponse {
  task: OperationalTask
}

export interface PartnerEventsResponse {
  events: PartnerEvent[]
}

export interface PartnerEventResponse {
  event: PartnerEvent
}

export interface PartnerEvaluationsResponse {
  evaluations: PartnerEvaluation[]
}

export interface PartnerEvaluationResponse {
  evaluation: PartnerEvaluation
}
