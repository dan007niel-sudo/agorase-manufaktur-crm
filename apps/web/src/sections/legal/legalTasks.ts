import type { LegalNote, OperationalTask } from '@agorase/shared'
import type { CrmTask } from '../../types'

const SOON_DAYS = 7
const COUNSEL_STALE_DAYS = 14

export function createLegalCommandTasks(
  notes: LegalNote[],
  persistedTasksById: Map<string, OperationalTask>,
  today: string,
): CrmTask[] {
  const tasks: CrmTask[] = []

  for (const note of notes) {
    if (note.status === 'resolved') continue

    if (
      note.riskLevel === 'critical' &&
      (note.status === 'open' || note.status === 'in-review' || note.status === 'awaiting-counsel')
    ) {
      const id = `legal-critical-${note.id}`
      tasks.push({
        id,
        manufactureId: '',
        title: `Kritisch: ${note.title}`,
        dueDate: note.nextActionDue,
        urgency: 'today',
        completed: persistedTasksById.get(id)?.status === 'done',
      })
    }

    if (note.nextActionDue) {
      if (note.nextActionDue < today) {
        const id = `legal-overdue-${note.id}`
        tasks.push({
          id,
          manufactureId: '',
          title: `Überfällig: ${note.nextAction || note.title}`,
          dueDate: note.nextActionDue,
          urgency: 'overdue',
          completed: persistedTasksById.get(id)?.status === 'done',
        })
      } else if (daysBetween(today, note.nextActionDue) <= SOON_DAYS) {
        const id = `legal-soon-${note.id}`
        tasks.push({
          id,
          manufactureId: '',
          title: `Bald fällig: ${note.title}`,
          dueDate: note.nextActionDue,
          urgency: note.nextActionDue === today ? 'today' : 'upcoming',
          completed: persistedTasksById.get(id)?.status === 'done',
        })
      }
    }

    if (note.status === 'awaiting-counsel' && note.updatedAt) {
      const updatedDateOnly = note.updatedAt.slice(0, 10)
      if (updatedDateOnly && daysBetween(updatedDateOnly, today) >= COUNSEL_STALE_DAYS) {
        const id = `legal-counsel-${note.id}`
        tasks.push({
          id,
          manufactureId: '',
          title: `Counsel-Antwort ausstehend: ${note.title}`,
          dueDate: '',
          urgency: 'today',
          completed: persistedTasksById.get(id)?.status === 'done',
        })
      }
    }
  }

  return tasks
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.floor((to - from) / (1000 * 60 * 60 * 24))
}
