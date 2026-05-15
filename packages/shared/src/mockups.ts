export type MockupAspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '3:4'

export const MOCKUP_ASPECT_RATIOS: readonly MockupAspectRatio[] = [
  '1:1',
  '4:5',
  '16:9',
  '9:16',
  '3:4',
]

export type MockupQuality = 'draft' | 'standard' | 'hi'

export const MOCKUP_QUALITIES: readonly MockupQuality[] = ['draft', 'standard', 'hi']

export type MockupJobStatus = 'pending' | 'completed' | 'failed'

export const MOCKUP_JOB_STATUSES: readonly MockupJobStatus[] = [
  'pending',
  'completed',
  'failed',
]

export interface MockupJob {
  id: string
  prompt: string
  referenceNotes: string
  aspectRatio: MockupAspectRatio
  quality: MockupQuality
  status: MockupJobStatus
  modelUsed: string
  imageUrl: string
  imageData: string
  mimeType: string
  error: string
  releaseId: string
  briefId: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface MockupJobInput {
  id: string
  prompt: string
  referenceNotes?: string
  aspectRatio?: MockupAspectRatio
  quality?: MockupQuality
  status?: MockupJobStatus
  modelUsed?: string
  imageUrl?: string
  imageData?: string
  mimeType?: string
  error?: string
  releaseId?: string
  briefId?: string
  notes?: string
}

export interface GenerateMockupRequest {
  prompt: string
  reference_notes?: string
  aspect_ratio?: MockupAspectRatio
  quality?: MockupQuality
  brief_id?: string
  release_id?: string
  notes?: string
}

export interface GenerateMockupResponse {
  job: MockupJob
}

export interface MockupJobsResponse {
  jobs: MockupJob[]
}

export interface MockupJobResponse {
  job: MockupJob
}
