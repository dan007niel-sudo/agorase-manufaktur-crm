// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminDiagnostics, AdminExportBundle } from '@agorase/shared'
import {
  downloadAdminExport,
  fetchAdminDiagnostics,
  fetchAdminExport,
} from './adminApi'

afterEach(() => vi.restoreAllMocks())

const emptyBundle: AdminExportBundle = {
  exportedAt: '2026-05-16T10:00:00.000Z',
  version: '1',
  partners: [],
  tasks: [],
  partnerEvents: [],
  partnerEvaluations: [],
  productionProfiles: [],
  sampleRequests: [],
  releases: [],
  releaseTasks: [],
  releasePartners: [],
  webOpsItems: [],
  creativeBriefs: [],
  creativeDirections: [],
  promptTemplates: [],
  mockupJobs: [],
  legalNotes: [],
}

const diagnostics: AdminDiagnostics = {
  checkedAt: '2026-05-16T10:00:00.000Z',
  providers: { geminiText: 'ready', geminiImage: 'ready', database: 'ready' },
  env: { geminiTextModel: 'gemini-text', geminiImageModel: 'gemini-image', allowedOriginsCount: 2 },
  deployment: { nodeEnv: 'production' },
}

describe('adminApi', () => {
  it('fetchAdminExport calls the export endpoint with credentials', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(emptyBundle), { status: 200 }))

    await expect(fetchAdminExport()).resolves.toEqual(emptyBundle)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/export',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('fetchAdminDiagnostics calls the diagnostics endpoint with credentials', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(diagnostics), { status: 200 }))

    await expect(fetchAdminDiagnostics()).resolves.toEqual(diagnostics)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/diagnostics',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('downloadAdminExport triggers a click on a generated link with a date-stamped filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(emptyBundle), { status: 200 }),
    )

    const createObjectURL = vi.fn(() => 'blob:agorase-export')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL

    const click = vi.fn()
    const realCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') {
          const link = realCreateElement('a') as HTMLAnchorElement
          link.click = click
          return link
        }
        return realCreateElement(tag as keyof HTMLElementTagNameMap)
      })

    try {
      const filename = await downloadAdminExport()

      expect(filename).toBe('agorase-export-2026-05-16.json')
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:agorase-export')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      createElementSpy.mockRestore()
    }
  })
})
