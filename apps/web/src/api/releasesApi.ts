import type {
  FashionRelease,
  ReleasePartnerLink,
  ReleasePartnerLinkResponse,
  ReleasePartnerLinksResponse,
  ReleaseResponse,
  ReleasesResponse,
  ReleaseTask,
  ReleaseTaskResponse,
  ReleaseTasksResponse,
} from '@agorase/shared'

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

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function listReleases() {
  const body = await requestJson<ReleasesResponse>('/api/releases', { method: 'GET' })
  return body.releases
}

export async function saveRelease(release: FashionRelease) {
  const body = await requestJson<ReleaseResponse>(`/api/releases/${encodeURIComponent(release.id)}`, {
    method: 'PUT',
    body: JSON.stringify(release),
  })
  return body.release
}

export async function listReleaseTasks(releaseId?: string) {
  const query = releaseId ? `?releaseId=${encodeURIComponent(releaseId)}` : ''
  const body = await requestJson<ReleaseTasksResponse>(`/api/releases/tasks${query}`, { method: 'GET' })
  return body.tasks
}

export async function saveReleaseTask(task: ReleaseTask) {
  const body = await requestJson<ReleaseTaskResponse>(`/api/releases/tasks/${encodeURIComponent(task.id)}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  })
  return body.task
}

export async function listReleasePartnerLinks(releaseId?: string) {
  const query = releaseId ? `?releaseId=${encodeURIComponent(releaseId)}` : ''
  const body = await requestJson<ReleasePartnerLinksResponse>(`/api/releases/partners${query}`, { method: 'GET' })
  return body.links
}

export async function saveReleasePartner(link: ReleasePartnerLink) {
  const body = await requestJson<ReleasePartnerLinkResponse>('/api/releases/partners', {
    method: 'POST',
    body: JSON.stringify(link),
  })
  return body.link
}

export async function deleteReleasePartner(releaseId: string, partnerId: string) {
  await requestJson<void>(`/api/releases/partners/${encodeURIComponent(releaseId)}/${encodeURIComponent(partnerId)}`, {
    method: 'DELETE',
  })
}
