import { calculateMetrics } from '../../crmUtils'
import type { FashionOsModule } from '../../fashionOs'
import type { CrmTask, Manufactory } from '../../types'
import { Metric, PanelHeader } from '../../components/Panel'
import { PartnerTable } from '../../components/PartnerTable'

type Section = FashionOsModule['section']

export function CommandCenter({
  metrics,
  records,
  tasks,
  onSelectRecord,
  onSectionChange,
  onToggleTask,
}: {
  metrics: ReturnType<typeof calculateMetrics>
  records: Manufactory[]
  tasks: CrmTask[]
  onSelectRecord: (id: string) => void
  onSectionChange: (section: Section) => void
  onToggleTask: (task: CrmTask) => void
}) {
  const topRecords = records.filter((record) => record.priority === 'A' || record.brandFit === 'A').slice(0, 4)

  return (
    <section className="view-grid">
      <div className="metric-grid">
        <Metric label="Gesamt" value={metrics.total} />
        <Metric label="Markenfit A" value={metrics.highFit} />
        <Metric label="Potenzial hoch" value={metrics.highPotential} />
        <Metric label="Heute dran" value={metrics.dueFollowUps} dark />
      </div>
      <div className="panel wide">
        <PanelHeader title="Priorisierte Fashion-Partner" action="Zu Partners" onClick={() => onSectionChange('Partners')} />
        <PartnerTable records={topRecords} onSelect={onSelectRecord} />
      </div>
      <div className="panel">
        <PanelHeader title="Nächste Schritte" action="Produktion" onClick={() => onSectionChange('Production')} />
        <TaskList tasks={tasks.slice(0, 5)} records={records} onToggle={onToggleTask} onSelectRecord={onSelectRecord} />
      </div>
    </section>
  )
}

function TaskList({
  tasks,
  records,
  onToggle,
  onSelectRecord,
}: {
  tasks: CrmTask[]
  records: Manufactory[]
  onToggle?: (task: CrmTask) => void
  onSelectRecord: (id: string) => void
}) {
  return (
    <div className="task-list">
      {tasks.map((task) => {
        const record = records.find((item) => item.id === task.manufactureId)
        return (
          <article className={`task-row ${task.urgency} ${task.completed ? 'done' : ''}`} key={task.id}>
            {onToggle && <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />}
            <button type="button" onClick={() => onSelectRecord(task.manufactureId)}>
              {task.title}
            </button>
            <span>{record?.name}</span>
            <small>{task.dueDate || 'ohne Datum'}</small>
          </article>
        )
      })}
    </div>
  )
}
