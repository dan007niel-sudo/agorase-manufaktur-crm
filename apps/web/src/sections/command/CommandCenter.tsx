import { calculateMetrics } from '../../crmUtils'
import { getDailyInspiration, getTimeGreeting } from '../../app/dailyInspiration'
import type { FashionOsModule } from '../../fashionOs'
import type { CrmTask, Manufactory } from '../../types'
import { Metric, PanelHeader } from '../../components/Panel'
import { PartnerTable } from '../../components/PartnerTable'

type Section = FashionOsModule['section']

export function CommandCenter({
  metrics,
  records,
  tasks,
  now = new Date(),
  onSelectRecord,
  onSectionChange,
  onToggleTask,
}: {
  metrics: ReturnType<typeof calculateMetrics>
  records: Manufactory[]
  tasks: CrmTask[]
  now?: Date
  onSelectRecord: (id: string) => void
  onSectionChange: (section: Section) => void
  onToggleTask: (task: CrmTask) => void
}) {
  const topRecords = records.filter((record) => record.priority === 'A' || record.brandFit === 'A').slice(0, 4)
  const greeting = getTimeGreeting(now, 'Max')
  const inspiration = getDailyInspiration(now)

  return (
    <section className="view-grid">
      <div className="command-welcome">
        <div>
          <span className="label">Persönlicher Start</span>
          <h2>{greeting}</h2>
          <p>Heute zählt Fokus, Klarheit und treue Arbeit.</p>
        </div>
        <article className="daily-inspiration" aria-label="Impuls des Tages">
          <div className="daily-inspiration__header">
            <span>Impuls des Tages</span>
            <strong>{inspiration.theme}</strong>
          </div>
          <blockquote>„{inspiration.excerpt}“</blockquote>
          <div className="daily-inspiration__meta">
            <span>{inspiration.reference}</span>
            <span>{inspiration.translation}</span>
          </div>
          <p>{inspiration.reflection}</p>
          <small>Heute: {inspiration.action.replace(/^Heute:\s*/, '')}</small>
        </article>
      </div>
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
