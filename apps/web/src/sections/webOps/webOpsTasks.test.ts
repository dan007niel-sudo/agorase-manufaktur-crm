import { describe, expect, it } from 'vitest'
import type { OperationalTask, WebOpsItem } from '@agorase/shared'
import { createWebOpsCommandTasks } from './webOpsTasks'

const baseItem: WebOpsItem = {
  id: 'page',
  releaseId: '',
  title: 'Landing page',
  kind: 'page-brief',
  status: 'in-progress',
  summary: '',
  body: '',
  targetUrl: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  checklist: [],
  assignee: '',
  dueDate: '',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('web ops command tasks', () => {
  it('surfaces blocked items and deployment checks as command tasks', () => {
    const items: WebOpsItem[] = [
      { ...baseItem, id: 'blocked-1', status: 'blocked', title: 'CMS migration', dueDate: '2026-05-13' },
      { ...baseItem, id: 'deploy-1', kind: 'deployment-check', title: 'Pre-launch deploy', dueDate: '2026-05-14' },
      { ...baseItem, id: 'noise', status: 'in-progress', kind: 'copy-brief', title: 'Should not appear' },
      { ...baseItem, id: 'shipped', status: 'shipped', kind: 'deployment-check', title: 'Already shipped' },
    ]
    const persisted = new Map<string, OperationalTask>([
      [
        'web-ops-deploy-1',
        {
          id: 'web-ops-deploy-1',
          title: 'Web Ops: Pre-launch deploy',
          section: 'Command Center',
          status: 'done',
          priority: 'high',
          partnerId: '',
          dueDate: '2026-05-14',
          notes: '',
          createdAt: '2026-05-15T00:00:00.000Z',
          updatedAt: '2026-05-15T00:00:00.000Z',
        },
      ],
    ])

    expect(createWebOpsCommandTasks(items, persisted, '2026-05-14')).toEqual([
      {
        id: 'web-ops-blocked-1',
        manufactureId: '',
        title: 'Web Ops Blocker: CMS migration',
        dueDate: '2026-05-13',
        urgency: 'overdue',
        completed: false,
      },
      {
        id: 'web-ops-deploy-1',
        manufactureId: '',
        title: 'Web Ops: Pre-launch deploy',
        dueDate: '2026-05-14',
        urgency: 'today',
        completed: true,
      },
    ])
  })
})
