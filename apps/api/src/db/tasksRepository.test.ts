import { describe, expect, it } from 'vitest'
import type { OperationalTask } from '@agorase/shared'
import { deleteTask, mapTaskRow, normalizeTaskInput, upsertTask } from './tasksRepository.js'

const task: OperationalTask = {
  id: 'atelier-forma-task',
  title: 'Line Sheet prüfen',
  section: 'Command Center',
  status: 'open',
  priority: 'high',
  partnerId: 'atelier-forma',
  dueDate: '2026-05-15',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('tasksRepository', () => {
  it('maps task rows to operational tasks', () => {
    expect(mapTaskRow(rowFromTask(task))).toMatchObject({ id: task.id, partnerId: task.partnerId, status: 'open' })
  })

  it('rejects missing task titles', () => {
    expect(() => normalizeTaskInput({ ...task, title: '' })).toThrow('Task title is required.')
  })

  it('upserts tasks with parameterized SQL', async () => {
    const pool = fakePool([{ rows: [rowFromTask(task)] }])

    const saved = await upsertTask(pool, task)

    expect(saved.id).toBe(task.id)
    expect(pool.calls[0]?.values).toContain(task.id)
    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
  })

  it('deletes tasks by id', async () => {
    const pool = fakePool([{ rows: [] }])

    await deleteTask(pool, task.id)

    expect(pool.calls[0]).toMatchObject({ values: [task.id] })
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

function rowFromTask(item: OperationalTask) {
  return {
    id: item.id,
    title: item.title,
    section: item.section,
    status: item.status,
    priority: item.priority,
    partner_id: item.partnerId,
    due_date: item.dueDate,
    notes: item.notes,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}
