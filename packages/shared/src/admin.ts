import type {
  CreativeBrief,
  CreativeDirection,
  PromptTemplate,
} from './creative.js'
import type { Manufactory } from './crm.js'
import type { LegalNote } from './legal.js'
import type { MockupJob } from './mockups.js'
import type {
  OperationalTask,
  PartnerEvaluation,
  PartnerEvent,
} from './operations.js'
import type { ProductionProfile, SampleRequest } from './production.js'
import type {
  FashionRelease,
  ReleasePartnerLink,
  ReleaseTask,
} from './releases.js'
import type { WebOpsItem } from './webOps.js'

export type AdminExportDomain =
  | 'partners'
  | 'tasks'
  | 'partnerEvents'
  | 'partnerEvaluations'
  | 'productionProfiles'
  | 'sampleRequests'
  | 'releases'
  | 'releaseTasks'
  | 'releasePartners'
  | 'webOpsItems'
  | 'creativeBriefs'
  | 'creativeDirections'
  | 'promptTemplates'
  | 'mockupJobs'
  | 'legalNotes'

export type AdminExportErrors = Partial<Record<AdminExportDomain, string>>

export interface AdminExportBundle {
  exportedAt: string
  version: string
  partners: Manufactory[]
  tasks: OperationalTask[]
  partnerEvents: PartnerEvent[]
  partnerEvaluations: PartnerEvaluation[]
  productionProfiles: ProductionProfile[]
  sampleRequests: SampleRequest[]
  releases: FashionRelease[]
  releaseTasks: ReleaseTask[]
  releasePartners: ReleasePartnerLink[]
  webOpsItems: WebOpsItem[]
  creativeBriefs: CreativeBrief[]
  creativeDirections: CreativeDirection[]
  promptTemplates: PromptTemplate[]
  mockupJobs: MockupJob[]
  legalNotes: LegalNote[]
  errors?: AdminExportErrors
}

export type AdminProviderStatus = 'ready' | 'not_configured'
export type AdminDatabaseStatus = 'ready' | 'unavailable'

export interface AdminDiagnostics {
  checkedAt: string
  providers: {
    geminiText: AdminProviderStatus
    geminiImage: AdminProviderStatus
    database: AdminDatabaseStatus
  }
  env: {
    geminiTextModel: string
    geminiImageModel: string
    allowedOriginsCount: number
  }
  deployment: {
    nodeEnv: string
  }
}
