export type ReleaseStatus = 'idea' | 'planning' | 'production' | 'content' | 'ready' | 'launched'
export type ReleaseContentStatus = 'not_started' | 'drafting' | 'review' | 'ready'
export type ReleaseTaskStatus = 'open' | 'done'

export interface FashionRelease {
  id: string
  name: string
  season: string
  launchDate: string
  status: ReleaseStatus
  summary: string
  contentStatus: ReleaseContentStatus
  readinessNotes: string
  createdAt: string
  updatedAt: string
}

export interface ReleaseTask {
  id: string
  releaseId: string
  title: string
  status: ReleaseTaskStatus
  owner: string
  dueDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ReleasePartnerLink {
  releaseId: string
  partnerId: string
  role: string
  createdAt: string
}

export interface ReleasesResponse {
  releases: FashionRelease[]
}

export interface ReleaseResponse {
  release: FashionRelease
}

export interface ReleaseTasksResponse {
  tasks: ReleaseTask[]
}

export interface ReleaseTaskResponse {
  task: ReleaseTask
}

export interface ReleasePartnerLinksResponse {
  links: ReleasePartnerLink[]
}

export interface ReleasePartnerLinkResponse {
  link: ReleasePartnerLink
}
