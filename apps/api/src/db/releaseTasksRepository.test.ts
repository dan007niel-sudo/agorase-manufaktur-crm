import { describe, expect, it } from 'vitest'
import type { ReleaseTask } from '@agorase/shared'
import {
  deleteReleaseTask,
  listReleaseTasks,
  mapReleaseTaskRow,
  normalizeReleaseTaskInput,
  upsertReleaseTask,
} from './releaseTasksRepository.js'

const task: ReleaseTask = {
  id: 'task-1',
  releaseId: 'drop-1',
  title: 'Finalize line sheet',
  status: 'open',
  owner: 'Daniel',
  dueDate: '2026-06-01',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('releaseTasksRepository', () => {
  it('maps rows to release tasks', () => {
    expect(mapReleaseTaskRow(rowFromTask(task))).toMatchObject({ id: task.id, releaseId: task.releaseId })
  })

  it('rejects tasks without release ids', () => {
    expect(() => normalizeReleaseTaskInput({ ...task, releaseId: '' })).toThrow('Release id is required.')
  })

  it('lists tasks with a release filter', async () => {
    const pool = fakePool([{ rows: [rowFromTask(task)] }])

    await expect(listReleaseTasks(pool, 'drop-1')).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('where release_id = $1')
    expect(pool.calls[0]?.values).toEqual(['drop-1'])
  })

  it('upserts and deletes tasks', async () => {
    const pool = fakePool([{ rows: [rowFromTask(task)] }, { rows: [] }])

    await upsertReleaseTask(pool, task)
    await deleteReleaseTask(pool, task.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [task.id] })
  })
})

function fakePool(results: Array<{ rows: Record<string, string>[] }>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  return {
    calls,
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values })
      return results.shift() ?? { rows: [] }
    },
    async end() {
      return undefined
    },
  }
}

function rowFromTask(item: ReleaseTask) {
  return {
    id: item.id,
    release_id: item.releaseId,
    title: item.title,
    status: item.status,
    owner: item.owner,
    due_date: item.dueDate,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
