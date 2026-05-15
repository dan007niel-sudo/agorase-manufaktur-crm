import { describe, expect, it } from 'vitest'
import type { OperationalTask, ReleaseTask } from '@agorase/shared'
import { createReleaseLaunchTasks } from './releaseTasks'

describe('release launch command tasks', () => {
  it('converts open release tasks into command center tasks with persisted completion', () => {
    const releaseTasks: ReleaseTask[] = [
      {
        id: 'line-sheet',
        releaseId: 'drop-1',
        title: 'Finalize line sheet',
        status: 'open',
        owner: 'Daniel',
        dueDate: '2026-05-13',
        notes: '',
        createdAt: '2026-05-15T00:00:00.000Z',
        updatedAt: '2026-05-15T00:00:00.000Z',
      },
      {
        id: 'content-ready',
        releaseId: 'drop-1',
        title: 'Content ready',
        status: 'done',
        owner: '',
        dueDate: '2026-05-18',
        notes: '',
        createdAt: '2026-05-15T00:00:00.000Z',
        updatedAt: '2026-05-15T00:00:00.000Z',
      },
    ]
    const persisted = new Map<string, OperationalTask>([
      [
        'release-line-sheet',
        {
          id: 'release-line-sheet',
          title: 'Release: Finalize line sheet',
          section: 'Command Center',
          status: 'done',
          priority: 'high',
          partnerId: '',
          dueDate: '2026-05-13',
          notes: '',
          createdAt: '2026-05-15T00:00:00.000Z',
          updatedAt: '2026-05-15T00:00:00.000Z',
        },
      ],
    ])

    expect(createReleaseLaunchTasks(releaseTasks, persisted, '2026-05-14')).toEqual([
      {
        id: 'release-line-sheet',
        manufactureId: '',
        title: 'Release: Finalize line sheet',
        dueDate: '2026-05-13',
        urgency: 'overdue',
        completed: true,
      },
    ])
  })
})
