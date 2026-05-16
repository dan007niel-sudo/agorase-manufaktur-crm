import { describe, expect, it } from 'vitest'
import type { LegalNote, OperationalTask } from '@agorase/shared'
import { createLegalCommandTasks } from './legalTasks'

const today = '2026-05-15'

function makeNote(overrides: Partial<LegalNote> = {}): LegalNote {
  return {
    id: 'legal-1',
    title: 'DSGVO Auftragsverarbeitung',
    topic: 'DSGVO',
    jurisdiction: 'DE',
    riskLevel: 'medium',
    status: 'open',
    summary: '',
    body: '',
    checklist: [],
    sourceLinks: '',
    nextAction: '',
    nextActionDue: '',
    responsible: '',
    releaseId: '',
    partnerId: '',
    notes: '',
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('createLegalCommandTasks', () => {
  it('flags critical-risk open notes as today urgency', () => {
    const tasks = createLegalCommandTasks(
      [makeNote({ id: 'n1', riskLevel: 'critical', status: 'open' })],
      new Map(),
      today,
    )
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      id: 'legal-critical-n1',
      urgency: 'today',
      title: expect.stringContaining('Kritisch'),
    })
  })

  it('flags overdue next-action dates', () => {
    const tasks = createLegalCommandTasks(
      [
        makeNote({
          id: 'n2',
          nextActionDue: '2026-04-01',
          nextAction: 'Counsel briefen',
          riskLevel: 'low',
        }),
      ],
      new Map(),
      today,
    )
    expect(tasks).toContainEqual(
      expect.objectContaining({
        id: 'legal-overdue-n2',
        urgency: 'overdue',
        title: expect.stringContaining('Überfällig'),
      }),
    )
  })

  it('flags soon-due notes within 7 days', () => {
    const tasks = createLegalCommandTasks(
      [makeNote({ id: 'n3', nextActionDue: '2026-05-18', riskLevel: 'low' })],
      new Map(),
      today,
    )
    expect(tasks).toContainEqual(
      expect.objectContaining({
        id: 'legal-soon-n3',
        urgency: 'upcoming',
        title: expect.stringContaining('Bald fällig'),
      }),
    )
  })

  it('flags stale awaiting-counsel notes older than 14 days', () => {
    const tasks = createLegalCommandTasks(
      [
        makeNote({
          id: 'n4',
          status: 'awaiting-counsel',
          updatedAt: '2026-04-15T00:00:00.000Z',
          riskLevel: 'low',
        }),
      ],
      new Map(),
      today,
    )
    expect(tasks).toContainEqual(
      expect.objectContaining({
        id: 'legal-counsel-n4',
        urgency: 'today',
        title: expect.stringContaining('Counsel-Antwort ausstehend'),
      }),
    )
  })

  it('skips resolved notes', () => {
    const tasks = createLegalCommandTasks(
      [makeNote({ id: 'n5', status: 'resolved', riskLevel: 'critical', nextActionDue: '2026-04-01' })],
      new Map(),
      today,
    )
    expect(tasks).toEqual([])
  })

  it('marks completed when persisted task is done', () => {
    const persisted = new Map<string, OperationalTask>([
      [
        'legal-critical-n6',
        {
          id: 'legal-critical-n6',
          title: 'Kritisch',
          section: 'Legal Orientation',
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
    const tasks = createLegalCommandTasks(
      [makeNote({ id: 'n6', riskLevel: 'critical', status: 'open' })],
      persisted,
      today,
    )
    expect(tasks[0]?.completed).toBe(true)
  })
})
