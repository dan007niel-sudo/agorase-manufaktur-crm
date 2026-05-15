import { describe, expect, it } from 'vitest'
import type {
  CreativeBrief,
  CreativeDirection,
  FashionRelease,
  OperationalTask,
} from '@agorase/shared'
import { createCreativeCommandTasks } from './creativeTasks'

const baseBrief: CreativeBrief = {
  id: 'brief-1',
  title: 'Capsule SS27',
  goal: '',
  audience: '',
  tone: '',
  references: '',
  season: 'SS27',
  releaseId: '',
  status: 'draft',
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const baseDirection: CreativeDirection = {
  id: 'dir',
  briefId: 'brief-1',
  title: 'Direction',
  summary: '',
  body: '',
  keywords: '',
  palette: '',
  materials: '',
  silhouettes: '',
  promptUsed: '',
  modelUsed: '',
  source: 'ai',
  saved: true,
  notes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

const baseRelease: FashionRelease = {
  id: 'drop-1',
  name: 'Drop 1',
  season: 'SS27',
  launchDate: '2026-05-20',
  status: 'planning',
  summary: '',
  contentStatus: 'drafting',
  readinessNotes: '',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('creative command tasks', () => {
  it('surfaces brainstorm, approval, and release-critical tasks with prefixed ids', () => {
    const briefs: CreativeBrief[] = [
      { ...baseBrief, id: 'b-explore', title: 'Explore', status: 'exploring' },
      { ...baseBrief, id: 'b-saved', title: 'Saved', status: 'directions-saved' },
      {
        ...baseBrief,
        id: 'b-approved',
        title: 'Approved',
        status: 'approved',
        releaseId: 'drop-1',
      },
      // Approved but linked release is too far away — should not produce a task.
      {
        ...baseBrief,
        id: 'b-approved-far',
        title: 'Approved far',
        status: 'approved',
        releaseId: 'drop-2',
      },
      // Exploring but already has a saved direction — should NOT produce a brainstorm task.
      { ...baseBrief, id: 'b-explore-saved', title: 'Has saves', status: 'exploring' },
      // Archived — should produce nothing.
      { ...baseBrief, id: 'b-archived', title: 'Archived', status: 'archived' },
    ]
    const directions: CreativeDirection[] = [
      { ...baseDirection, id: 'd1', briefId: 'b-explore-saved', saved: true },
      // Unsaved direction shouldn't count as a saved one.
      { ...baseDirection, id: 'd2', briefId: 'b-explore', saved: false },
    ]
    const releases: FashionRelease[] = [
      baseRelease,
      { ...baseRelease, id: 'drop-2', launchDate: '2026-08-01', name: 'Drop 2' },
    ]
    const persisted = new Map<string, OperationalTask>([
      [
        'creative-approve-b-saved',
        {
          id: 'creative-approve-b-saved',
          title: 'Direction für Brief Saved freigeben',
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

    const tasks = createCreativeCommandTasks({
      briefs,
      directions,
      releases,
      persistedTasksById: persisted,
      today: '2026-05-15',
    })

    expect(tasks).toEqual([
      {
        id: 'creative-brainstorm-b-explore',
        manufactureId: '',
        title: 'Brainstorming für Brief Explore starten',
        dueDate: '',
        urgency: 'today',
        completed: false,
      },
      {
        id: 'creative-approve-b-saved',
        manufactureId: '',
        title: 'Direction für Brief Saved freigeben',
        dueDate: '',
        urgency: 'today',
        completed: true,
      },
      {
        id: 'creative-release-b-approved',
        manufactureId: '',
        title: 'Release-kritisch: Approved (Drop 1)',
        dueDate: '2026-05-20',
        urgency: 'upcoming',
        completed: false,
      },
    ])
  })
})
