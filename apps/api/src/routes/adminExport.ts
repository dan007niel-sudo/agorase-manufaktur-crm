import type {
  AdminExportBundle,
  AdminExportDomain,
  AdminExportErrors,
} from '@agorase/shared'
import type { ApiContext } from '../index.js'
import { errorResponse, jsonResponse, resolveOrigin } from '../http.js'

const EXPORT_VERSION = '1'

const REQUIRED_REPOSITORY_KEYS = [
  'partnersRepository',
  'tasksRepository',
  'partnerEventsRepository',
  'partnerEvaluationsRepository',
  'productionProfilesRepository',
  'sampleRequestsRepository',
  'releasesRepository',
  'releaseTasksRepository',
  'releasePartnersRepository',
  'webOpsItemsRepository',
  'creativeBriefsRepository',
  'creativeDirectionsRepository',
  'promptTemplatesRepository',
  'mockupJobsRepository',
  'legalNotesRepository',
] as const satisfies ReadonlyArray<keyof ApiContext>

export async function adminExportRoute(request: Request, context: ApiContext) {
  const env = context.env
  const origin = resolveOrigin(request, env.allowedOrigins)

  if (request.method !== 'GET') {
    return errorResponse('method_not_allowed', 'Method not allowed.', 405, origin)
  }

  for (const key of REQUIRED_REPOSITORY_KEYS) {
    if (!context[key]) {
      return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
    }
  }

  const errors: AdminExportErrors = {}

  const collect = async <T>(
    domain: AdminExportDomain,
    loader: () => Promise<T[]>,
  ): Promise<T[]> => {
    try {
      return await loader()
    } catch (error) {
      errors[domain] = error instanceof Error ? error.message : 'unknown_error'
      return []
    }
  }

  const [
    partners,
    tasks,
    partnerEvents,
    partnerEvaluations,
    productionProfiles,
    sampleRequests,
    releases,
    releaseTasks,
    releasePartners,
    webOpsItems,
    creativeBriefs,
    creativeDirections,
    promptTemplates,
    mockupJobs,
    legalNotes,
  ] = await Promise.all([
    collect('partners', () => context.partnersRepository!.list()),
    collect('tasks', () => context.tasksRepository!.list()),
    collect('partnerEvents', () => context.partnerEventsRepository!.list()),
    collect('partnerEvaluations', () => context.partnerEvaluationsRepository!.list()),
    collect('productionProfiles', () => context.productionProfilesRepository!.list()),
    collect('sampleRequests', () => context.sampleRequestsRepository!.list()),
    collect('releases', () => context.releasesRepository!.list()),
    collect('releaseTasks', () => context.releaseTasksRepository!.list()),
    collect('releasePartners', () => context.releasePartnersRepository!.list()),
    collect('webOpsItems', () => context.webOpsItemsRepository!.list()),
    collect('creativeBriefs', () => context.creativeBriefsRepository!.list()),
    collect('creativeDirections', () => context.creativeDirectionsRepository!.list()),
    collect('promptTemplates', () => context.promptTemplatesRepository!.list()),
    collect('mockupJobs', () => context.mockupJobsRepository!.list()),
    collect('legalNotes', () => context.legalNotesRepository!.list()),
  ])

  const exportedAt = new Date().toISOString()
  const bundle: AdminExportBundle = {
    exportedAt,
    version: EXPORT_VERSION,
    partners,
    tasks,
    partnerEvents,
    partnerEvaluations,
    productionProfiles,
    sampleRequests,
    releases,
    releaseTasks,
    releasePartners,
    webOpsItems,
    creativeBriefs,
    creativeDirections,
    promptTemplates,
    mockupJobs,
    legalNotes,
  }

  if (Object.keys(errors).length > 0) {
    bundle.errors = errors
  }

  const filename = `agorase-export-${exportedAt.slice(0, 10)}.json`
  return jsonResponse(bundle, 200, origin, {
    'content-disposition': `attachment; filename="${filename}"`,
  })
}
