export type ProductionReadinessStatus = 'unknown' | 'blocked' | 'review' | 'ready'
export type SampleRequestStatus = 'planned' | 'requested' | 'received' | 'approved' | 'rejected'

export interface ProductionProfile {
  partnerId: string
  capabilities: string
  materials: string
  moq: string
  leadTime: string
  certifications: string
  costNotes: string
  qualityNotes: string
  readinessStatus: ProductionReadinessStatus
  readinessScore: number
  blocker: string
  updatedAt: string
}

export interface SampleRequest {
  id: string
  partnerId: string
  title: string
  status: SampleRequestStatus
  requestedAt: string
  targetDate: string
  costEstimate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ProductionProfilesResponse {
  profiles: ProductionProfile[]
}

export interface ProductionProfileResponse {
  profile: ProductionProfile
}

export interface SampleRequestsResponse {
  samples: SampleRequest[]
}

export interface SampleRequestResponse {
  sample: SampleRequest
}
