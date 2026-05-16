import type { AdminDiagnostics, AdminExportBundle } from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchAdminExport(): Promise<AdminExportBundle> {
  return requestJson<AdminExportBundle>('/api/admin/export', { method: 'GET' })
}

export async function fetchAdminDiagnostics(): Promise<AdminDiagnostics> {
  return requestJson<AdminDiagnostics>('/api/admin/diagnostics', { method: 'GET' })
}

export async function downloadAdminExport(): Promise<string> {
  const bundle = await fetchAdminExport()
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const filename = `agorase-export-${bundle.exportedAt.slice(0, 10)}.json`
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(url)
  }
  return filename
}
