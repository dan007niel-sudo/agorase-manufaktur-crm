import type {
  CreativeBrief,
  CreativeDirection,
  FashionRelease,
  OperationalTask,
} from '@agorase/shared'
import type { CrmTask } from '../../types'

const RELEASE_CRITICAL_DAYS = 14

export interface CreativeTasksInput {
  briefs: CreativeBrief[]
  directions: CreativeDirection[]
  releases: FashionRelease[]
  persistedTasksById: Map<string, OperationalTask>
  today: string
}

export function createCreativeCommandTasks({
  briefs,
  directions,
  releases,
  persistedTasksById,
  today,
}: CreativeTasksInput): CrmTask[] {
  const savedDirectionsByBrief = countSavedDirectionsByBrief(directions)
  const releasesById = new Map(releases.map((release) => [release.id, release]))
  const tasks: CrmTask[] = []

  for (const brief of briefs) {
    if (brief.status === 'exploring' && (savedDirectionsByBrief.get(brief.id) ?? 0) === 0) {
      const id = `creative-brainstorm-${brief.id}`
      tasks.push({
        id,
        manufactureId: '',
        title: `Brainstorming für Brief ${brief.title} starten`,
        dueDate: '',
        urgency: 'today',
        completed: persistedTasksById.get(id)?.status === 'done',
      })
    }

    if (brief.status === 'directions-saved') {
      const id = `creative-approve-${brief.id}`
      tasks.push({
        id,
        manufactureId: '',
        title: `Direction für Brief ${brief.title} freigeben`,
        dueDate: '',
        urgency: 'today',
        completed: persistedTasksById.get(id)?.status === 'done',
      })
    }

    if (brief.status === 'approved' && brief.releaseId) {
      const release = releasesById.get(brief.releaseId)
      if (release && isWithinDays(release.launchDate, today, RELEASE_CRITICAL_DAYS)) {
        const id = `creative-release-${brief.id}`
        tasks.push({
          id,
          manufactureId: '',
          title: `Release-kritisch: ${brief.title} (${release.name})`,
          dueDate: release.launchDate,
          urgency: getUrgency(release.launchDate, today),
          completed: persistedTasksById.get(id)?.status === 'done',
        })
      }
    }
  }

  return tasks
}

function countSavedDirectionsByBrief(directions: CreativeDirection[]) {
  const counts = new Map<string, number>()
  for (const direction of directions) {
    if (!direction.saved) continue
    counts.set(direction.briefId, (counts.get(direction.briefId) ?? 0) + 1)
  }
  return counts
}

function isWithinDays(launchDate: string, today: string, days: number) {
  if (!launchDate) return false
  const launch = Date.parse(launchDate)
  const reference = Date.parse(today)
  if (Number.isNaN(launch) || Number.isNaN(reference)) return false
  const diffDays = Math.floor((launch - reference) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays < days
}

function getUrgency(date: string, today: string): CrmTask['urgency'] {
  if (!date) return 'upcoming'
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  return 'upcoming'
}
