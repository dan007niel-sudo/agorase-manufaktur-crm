import type { OperationalTask, ReleaseTask } from '@agorase/shared'
import type { CrmTask } from '../../types'

export function createReleaseLaunchTasks(
  releaseTasks: ReleaseTask[],
  persistedTasksById: Map<string, OperationalTask>,
  today: string,
): CrmTask[] {
  return releaseTasks
    .filter((task) => task.status === 'open')
    .map((task) => {
      const id = `release-${task.id}`
      return {
        id,
        manufactureId: '',
        title: `Release: ${task.title}`,
        dueDate: task.dueDate,
        urgency: getUrgency(task.dueDate, today),
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
