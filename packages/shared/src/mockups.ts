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

// RHE product modes — drives garment-specific prompt construction (gsm hints, fit, silhouettes).
export type MockupProductMode =
  | 'T-Shirt'
  | 'Oversized Shirt'
  | 'Kurzärmeliges Hemd'
  | 'Hoodie'
  | 'Sweater'

export const MOCKUP_PRODUCT_MODES: readonly MockupProductMode[] = [
  'T-Shirt',
  'Oversized Shirt',
  'Kurzärmeliges Hemd',
  'Hoodie',
  'Sweater',
]

// RHE image modes — drives camera/composition direction.
export type MockupImageMode =
  | 'Flatlay'
  | 'Model-Shot'
  | 'Ghost-Mannequin'
  | 'Lookbook'
  | 'Tech Pack View'

export const MOCKUP_IMAGE_MODES: readonly MockupImageMode[] = [
  'Flatlay',
  'Model-Shot',
  'Ghost-Mannequin',
  'Lookbook',
  'Tech Pack View',
]

export interface MockupPrintFields {
  front: string
  back: string
  sleeve: string
  printSizeCm: string
}

export type MockupQualityCheckStatus = 'ready' | 'review' | 'blocked'

export interface MockupQualityCheck {
  label: string
  status: MockupQualityCheckStatus
  note: string
}

export interface MockupQualityReport {
  score: number
  status: MockupQualityCheckStatus
  summary: string
  checks: MockupQualityCheck[]
  recommendations: string[]
}

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
  productMode: MockupProductMode | ''
  imageMode: MockupImageMode | ''
  garmentColor: string
  fabric: string
  printMethod: string
  placement: string
  designText: string
  typographyPreset: string
  typographyFreeform: string
  printFields: MockupPrintFields
  qualityReport: MockupQualityReport | null
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
  productMode?: MockupProductMode | ''
  imageMode?: MockupImageMode | ''
  garmentColor?: string
  fabric?: string
  printMethod?: string
  placement?: string
  designText?: string
  typographyPreset?: string
  typographyFreeform?: string
  printFields?: Partial<MockupPrintFields>
  qualityReport?: MockupQualityReport | null
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
  product_mode?: MockupProductMode
  image_mode?: MockupImageMode
  garment_color?: string
  fabric?: string
  print_method?: string
  placement?: string
  design_text?: string
  typography_preset?: string
  typography_freeform?: string
  print_fields?: Partial<MockupPrintFields>
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
