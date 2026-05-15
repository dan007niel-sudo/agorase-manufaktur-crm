import type { OperationalTask, TaskResponse, TasksResponse } from '@agorase/shared'

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

export async function listTasks() {
  const body = await requestJson<TasksResponse>('/api/tasks', { method: 'GET' })
  return body.tasks
}

export async function saveTask(task: OperationalTask) {
  const body = await requestJson<TaskResponse>(`/api/tasks/${encodeURIComponent(task.id)}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  })
  return body.task
}

export async function deleteTask(id: string) {
  await requestJson<void>(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
