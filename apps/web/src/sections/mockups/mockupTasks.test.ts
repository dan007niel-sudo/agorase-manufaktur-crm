import { describe, expect, it } from 'vitest'
import type { MockupJob, OperationalTask } from '@agorase/shared'
import { createMockupCommandTasks } from './mockupTasks'

const baseJob: MockupJob = {
  id: 'mockup-1',
  prompt: 'A poetic SS27 capsule mockup with quiet layered knits and tonal palette.',
  referenceNotes: '',
  aspectRatio: '1:1',
  quality: 'standard',
  status: 'completed',
  modelUsed: 'gemini-3-pro-image-preview',
  imageUrl: '',
  imageData: '',
  mimeType: '',
  error: '',
  releaseId: '',
  briefId: '',
  notes: '',
  referenceImages: [],
  createdAt: '2026-05-15T12:00:00.000Z',
  updatedAt: '2026-05-15T12:00:00.000Z',
}

describe('mockup command tasks', () => {
  it('surfaces failed jobs from the last 7 days and stuck pending jobs older than 5 minutes', () => {
    const now = '2026-05-15T13:00:00.000Z'
    const jobs: MockupJob[] = [
      // Recent failure — should surface.
      { ...baseJob, id: 'failed-recent', status: 'failed', updatedAt: '2026-05-14T13:00:00.000Z' },
      // Old failure (8 days) — should NOT surface.
      { ...baseJob, id: 'failed-old', status: 'failed', updatedAt: '2026-05-07T12:00:00.000Z' },
      // Stuck pending (1 hour old) — should surface.
      { ...baseJob, id: 'pending-stuck', status: 'pending', createdAt: '2026-05-15T12:00:00.000Z' },
      // Fresh pending (1 minute old) — should NOT surface.
      { ...baseJob, id: 'pending-fresh', status: 'pending', createdAt: '2026-05-15T12:59:00.000Z' },
      // Completed — should never surface.
      { ...baseJob, id: 'completed', status: 'completed', updatedAt: '2026-05-14T13:00:00.000Z' },
    ]
    const persisted = new Map<string, OperationalTask>([
      [
        'mockup-failed-failed-recent',
        {
          id: 'mockup-failed-failed-recent',
          title: 'persisted',
          section: 'Command Center',
          status: 'done',
          priority: 'high',
          partnerId: '',
          dueDate: '',
          notes: '',
          createdAt: '2026-05-15T00:00:00.000Z',
          updatedAt: '2026-05-15T00:00:00.000Z',
        },
      ],
    ])

    const tasks = createMockupCommandTasks({ jobs, persistedTasksById: persisted, now })

    expect(tasks).toEqual([
      {
        id: 'mockup-failed-failed-recent',
        manufactureId: '',
        title: 'Mockup fehlgeschlagen: A poetic SS27 capsule mockup with quiet layered knits and to…',
        dueDate: '',
        urgency: 'today',
        completed: true,
      },
      {
        id: 'mockup-pending-pending-stuck',
        manufactureId: '',
        title: 'Mockup-Job hängt: A poetic SS27 capsule mockup with quiet layered knits and to…',
        dueDate: '',
        urgency: 'today',
        completed: false,
      },
    ])
  })
})
