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

export type MockupReferenceKind = 'style' | 'sketch' | 'reference'

export const MOCKUP_REFERENCE_KINDS: readonly MockupReferenceKind[] = [
  'style',
  'sketch',
  'reference',
]

export interface MockupReference {
  id: string
  name: string
  data: string
  mimeType: string
  kind: MockupReferenceKind
}

export const MOCKUP_MAX_REFERENCES = 3
export const MOCKUP_MAX_REFERENCE_BYTES = 2 * 1024 * 1024
export const MOCKUP_ALLOWED_REFERENCE_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
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
  referenceImages: MockupReference[]
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
  referenceImages?: MockupReference[]
}

export interface GenerateMockupRequest {
  prompt: string
  reference_notes?: string
  aspect_ratio?: MockupAspectRatio
  quality?: MockupQuality
  brief_id?: string
  release_id?: string
  notes?: string
  reference_images?: MockupReference[]
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
