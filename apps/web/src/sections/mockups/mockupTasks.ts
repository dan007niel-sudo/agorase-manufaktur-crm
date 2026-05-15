import type { MockupJob, OperationalTask } from '@agorase/shared'
import type { CrmTask } from '../../types'

const FAILED_LOOKBACK_DAYS = 7
const PENDING_STUCK_MINUTES = 5
const PROMPT_SNIPPET_LENGTH = 60

export interface MockupTasksInput {
  jobs: MockupJob[]
  persistedTasksById: Map<string, OperationalTask>
  now: string
}

export function createMockupCommandTasks({
  jobs,
  persistedTasksById,
  now,
}: MockupTasksInput): CrmTask[] {
  const reference = Date.parse(now)
  const tasks: CrmTask[] = []

  for (const job of jobs) {
    if (job.status === 'failed' && isWithinDays(job.updatedAt || job.createdAt, reference, FAILED_LOOKBACK_DAYS)) {
      const id = `mockup-failed-${job.id}`
      tasks.push({
        id,
        manufactureId: '',
        title: `Mockup fehlgeschlagen: ${snippet(job.prompt)}`,
        dueDate: '',
        urgency: 'today',
        completed: persistedTasksById.get(id)?.status === 'done',
      })
      continue
    }

    if (job.status === 'pending' && isOlderThanMinutes(job.createdAt, reference, PENDING_STUCK_MINUTES)) {
      const id = `mockup-pending-${job.id}`
      tasks.push({
        id,
        manufactureId: '',
        title: `Mockup-Job hängt: ${snippet(job.prompt)}`,
        dueDate: '',
        urgency: 'today',
        completed: persistedTasksById.get(id)?.status === 'done',
      })
    }
  }

  return tasks
}

function snippet(prompt: string) {
  const trimmed = prompt.trim()
  if (trimmed.length <= PROMPT_SNIPPET_LENGTH) return trimmed
  return `${trimmed.slice(0, PROMPT_SNIPPET_LENGTH).trimEnd()}…`
}

function isWithinDays(timestamp: string, reference: number, days: number) {
  if (!timestamp || !Number.isFinite(reference)) return false
  const moment = Date.parse(timestamp)
  if (Number.isNaN(moment)) return false
  const diffMs = reference - moment
  if (diffMs < 0) return true
  return diffMs <= days * 24 * 60 * 60 * 1000
}

function isOlderThanMinutes(timestamp: string, reference: number, minutes: number) {
  if (!timestamp || !Number.isFinite(reference)) return false
  const moment = Date.parse(timestamp)
  if (Number.isNaN(moment)) return false
  return reference - moment > minutes * 60 * 1000
}
