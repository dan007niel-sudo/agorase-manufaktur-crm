export type WebOpsKind =
  | 'page-brief'
  | 'copy-brief'
  | 'seo-note'
  | 'publishing-task'
  | 'deployment-check'

export type WebOpsStatus = 'idea' | 'in-progress' | 'review' | 'ready' | 'shipped' | 'blocked'

export const WEB_OPS_KINDS: readonly WebOpsKind[] = [
  'page-brief',
  'copy-brief',
  'seo-note',
  'publishing-task',
  'deployment-check',
]

export const WEB_OPS_STATUSES: readonly WebOpsStatus[] = [
  'idea',
  'in-progress',
  'review',
  'ready',
  'shipped',
  'blocked',
]

export interface WebOpsChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface WebOpsItem {
  id: string
  releaseId: string
  title: string
  kind: WebOpsKind
  status: WebOpsStatus
  summary: string
  body: string
  targetUrl: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  checklist: WebOpsChecklistItem[]
  assignee: string
  dueDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface WebOpsItemInput {
  id: string
  title: string
  kind: WebOpsKind
  status?: WebOpsStatus
  releaseId?: string
  summary?: string
  body?: string
  targetUrl?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  checklist?: WebOpsChecklistItem[]
  assignee?: string
  dueDate?: string
  notes?: string
}

export interface WebOpsItemsResponse {
  items: WebOpsItem[]
}

export interface WebOpsItemResponse {
  item: WebOpsItem
}
