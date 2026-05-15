import type { OperationalTask, WebOpsItem } from '@agorase/shared'
import type { CrmTask } from '../../types'

export function createWebOpsCommandTasks(
  items: WebOpsItem[],
  persistedTasksById: Map<string, OperationalTask>,
  today: string,
): CrmTask[] {
  return items
    .filter((item) => item.status !== 'shipped')
    .filter((item) => item.status === 'blocked' || item.kind === 'deployment-check')
    .map((item) => {
      const id = `web-ops-${item.id}`
      const blocker = item.status === 'blocked'
      return {
        id,
        manufactureId: '',
        title: blocker ? `Web Ops Blocker: ${item.title}` : `Web Ops: ${item.title}`,
        dueDate: item.dueDate,
        urgency: getUrgency(item.dueDate, today),
        completed: persistedTasksById.get(id)?.status === 'done',
      }
    })
}

function getUrgency(date: string, today: string): CrmTask['urgency'] {
  if (!date) return 'upcoming'
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  return 'upcoming'
}
