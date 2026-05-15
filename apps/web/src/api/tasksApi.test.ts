import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OperationalTask } from '@agorase/shared'
import { deleteTask, listTasks, saveTask } from './tasksApi'

afterEach(() => vi.restoreAllMocks())

const task: OperationalTask = {
  id: 'atelier-forma-task',
  title: 'Line Sheet prüfen',
  section: 'Command Center',
  status: 'done',
  priority: 'high',
  partnerId: 'atelier-forma',
  dueDate: '2026-05-15',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('tasksApi', () => {
  it('loads tasks with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ tasks: [task] }), { status: 200 }))

    await expect(listTasks()).resolves.toEqual([task])

    expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ method: 'GET', credentials: 'include' }))
  })

  it('saves tasks by encoded id with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ task }), { status: 200 }))

    await saveTask({ ...task, id: 'atelier/forma task' })

    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/atelier%2Fforma%20task',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    )
  })

  it('deletes tasks with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await deleteTask('atelier-forma-task')

    expect(fetch).toHaveBeenCalledWith(
      '/api/tasks/atelier-forma-task',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })
})
