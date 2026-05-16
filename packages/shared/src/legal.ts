export type LegalRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type LegalNoteStatus =
  | 'open'
  | 'in-review'
  | 'awaiting-counsel'
  | 'resolved'
  | 'monitoring'

export const LEGAL_RISK_LEVELS: readonly LegalRiskLevel[] = ['low', 'medium', 'high', 'critical']

export const LEGAL_NOTE_STATUSES: readonly LegalNoteStatus[] = [
  'open',
  'in-review',
  'awaiting-counsel',
  'resolved',
  'monitoring',
]

export interface LegalChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface LegalNote {
  id: string
  title: string
  topic: string
  jurisdiction: string
  riskLevel: LegalRiskLevel
  status: LegalNoteStatus
  summary: string
  body: string
  checklist: LegalChecklistItem[]
  sourceLinks: string
  nextAction: string
  nextActionDue: string
  responsible: string
  releaseId: string
  partnerId: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface LegalNoteInput {
  id: string
  title: string
  riskLevel: LegalRiskLevel
  status: LegalNoteStatus
  topic?: string
  jurisdiction?: string
  summary?: string
  body?: string
  checklist?: LegalChecklistItem[]
  sourceLinks?: string
  nextAction?: string
  nextActionDue?: string
  responsible?: string
  releaseId?: string
  partnerId?: string
  notes?: string
}

export interface LegalNotesResponse {
  notes: LegalNote[]
}

export interface LegalNoteResponse {
  note: LegalNote
}
