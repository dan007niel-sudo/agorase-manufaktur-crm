import { useEffect, useMemo, useState } from 'react'
import type { FashionRelease, ReleasePartnerLink, ReleaseTask } from '@agorase/shared'
import {
  deleteReleasePartner,
  listReleasePartnerLinks,
  listReleaseTasks,
  listReleases,
  saveRelease,
  saveReleasePartner,
  saveReleaseTask,
} from '../../api/releasesApi'
import { PanelHeader } from '../../components/Panel'
import type { FashionOsModule } from '../../fashionOs'
import type { Manufactory } from '../../types'

export function ReleasesView({ module, records }: { module: FashionOsModule; records: Manufactory[] }) {
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [tasks, setTasks] = useState<ReleaseTask[]>([])
  const [links, setLinks] = useState<ReleasePartnerLink[]>([])
  const [selectedReleaseId, setSelectedReleaseId] = useState('')
  const [partnerId, setPartnerId] = useState(records[0]?.id ?? '')
  const [partnerRole, setPartnerRole] = useState('Production')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const effectiveSelectedReleaseId = selectedReleaseId || releases[0]?.id || ''
  const selectedRelease = releases.find((release) => release.id === effectiveSelectedReleaseId) ?? releases[0]
  const releaseTasks = tasks.filter((task) => task.releaseId === selectedRelease?.id)
  const releaseLinks = links.filter((link) => link.releaseId === selectedRelease?.id)
  const linkedPartnerIds = useMemo(() => new Set(releaseLinks.map((link) => link.partnerId)), [releaseLinks])
  const availablePartners = records.filter((record) => !linkedPartnerIds.has(record.id))

  useEffect(() => {
    let active = true

    async function loadReleases() {
      try {
        const [loadedReleases, loadedTasks, loadedLinks] = await Promise.all([
          listReleases(),
          listReleaseTasks(),
          listReleasePartnerLinks(),
        ])
        if (!active) return
        setReleases(loadedReleases)
        setTasks(loadedTasks)
        setLinks(loadedLinks)
        setSelectedReleaseId((current) => current || loadedReleases[0]?.id || '')
        setStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Releases konnten nicht geladen werden.')
      }
    }

    void loadReleases()
    return () => {
      active = false
    }
  }, [])

  async function addRelease() {
    const release = createRelease()
    await persistRelease(release)
    setSelectedReleaseId(release.id)
  }

  async function updateRelease(patch: Partial<FashionRelease>) {
    if (!selectedRelease) return
    await persistRelease({ ...selectedRelease, ...patch })
  }

  async function persistRelease(release: FashionRelease) {
    try {
      const saved = await saveRelease(release)
      setReleases((current) => upsertRelease(current, saved))
      setStatus('ready')
      setError('')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Release konnte nicht gespeichert werden.')
    }
  }

  async function addTask() {
    if (!selectedRelease) return
    const saved = await saveReleaseTask(createTask(selectedRelease.id))
    setTasks((current) => upsertTask(current, saved))
  }

  async function updateTask(task: ReleaseTask, patch: Partial<ReleaseTask>) {
    const saved = await saveReleaseTask({ ...task, ...patch })
    setTasks((current) => upsertTask(current, saved))
  }

  async function addPartnerLink() {
    if (!selectedRelease || !partnerId) return
    const saved = await saveReleasePartner({
      releaseId: selectedRelease.id,
      partnerId,
      role: partnerRole,
      createdAt: new Date().toISOString(),
    })
    setLinks((current) => upsertLink(current, saved))
    setPartnerId(availablePartners.find((record) => record.id !== partnerId)?.id ?? '')
  }

  async function removePartnerLink(link: ReleasePartnerLink) {
    await deleteReleasePartner(link.releaseId, link.partnerId)
    setLinks((current) => current.filter((item) => item.releaseId !== link.releaseId || item.partnerId !== link.partnerId))
  }

  return (
    <section className="releases-layout">
      <aside className="release-list panel">
        <PanelHeader title="Release Roadmap" action="Neue Release" onClick={() => void addRelease()} />
        {!releases.length && <div className="empty-state">Noch keine Releases geplant.</div>}
        {releases.map((release) => (
          <button
            className={release.id === selectedRelease?.id ? 'release-card selected' : 'release-card'}
            key={release.id}
            type="button"
            onClick={() => setSelectedReleaseId(release.id)}
          >
            <strong>{release.name}</strong>
            <span>{release.season || 'Ohne Saison'}</span>
            <small>{release.launchDate || 'Launch offen'}</small>
          </button>
        ))}
      </aside>

      <section className="release-workspace panel">
        <PanelHeader title={module.label} />
        {status === 'error' && <div className="error-box">{error}</div>}
        {status === 'loading' && <div className="empty-state">Releases werden geladen.</div>}
        {!selectedRelease && status !== 'loading' && <div className="empty-state">Lege eine Release an, um Launch Tasks zu planen.</div>}
        {selectedRelease && (
          <>
            <div className="release-summary">
              <div>
                <span className="label">Status</span>
                <strong>{selectedRelease.status}</strong>
              </div>
              <div>
                <span className="label">Content</span>
                <strong>{selectedRelease.contentStatus}</strong>
              </div>
              <div>
                <span className="label">Offene Tasks</span>
                <strong>{releaseTasks.filter((task) => task.status === 'open').length}</strong>
              </div>
            </div>
            <div className="release-detail-grid">
              <ReleaseEditor release={selectedRelease} onChange={(patch) => void updateRelease(patch)} />
              <ReleaseTaskList tasks={releaseTasks} onAdd={() => void addTask()} onChange={(task, patch) => void updateTask(task, patch)} />
              <ReleasePartnerLinks
                links={releaseLinks}
                records={records}
                availablePartners={availablePartners}
                partnerId={partnerId}
                partnerRole={partnerRole}
                onPartnerChange={setPartnerId}
                onRoleChange={setPartnerRole}
                onAdd={() => void addPartnerLink()}
                onRemove={(link) => void removePartnerLink(link)}
              />
            </div>
          </>
        )}
      </section>
    </section>
  )
}

function ReleaseEditor({ release, onChange }: { release: FashionRelease; onChange: (patch: Partial<FashionRelease>) => void }) {
  return (
    <div className="release-panel">
      <h3>Collection State</h3>
      <label>
        Name
        <input value={release.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Saison
          <input value={release.season} onChange={(event) => onChange({ season: event.target.value })} />
        </label>
        <label>
          Launch
          <input type="date" value={release.launchDate} onChange={(event) => onChange({ launchDate: event.target.value })} />
        </label>
      </div>
      <div className="form-grid two">
        <label>
          Status
          <select value={release.status} onChange={(event) => onChange({ status: event.target.value as FashionRelease['status'] })}>
            <option value="idea">idea</option>
            <option value="planning">planning</option>
            <option value="production">production</option>
            <option value="content">content</option>
            <option value="ready">ready</option>
            <option value="launched">launched</option>
          </select>
        </label>
        <label>
          Content
          <select
            value={release.contentStatus}
            onChange={(event) => onChange({ contentStatus: event.target.value as FashionRelease['contentStatus'] })}
          >
            <option value="not_started">not_started</option>
            <option value="drafting">drafting</option>
            <option value="review">review</option>
            <option value="ready">ready</option>
          </select>
        </label>
      </div>
      <label>
        Summary
        <textarea value={release.summary} onChange={(event) => onChange({ summary: event.target.value })} />
      </label>
      <label>
        Readiness Notes
        <textarea value={release.readinessNotes} onChange={(event) => onChange({ readinessNotes: event.target.value })} />
      </label>
    </div>
  )
}

function ReleaseTaskList({
  tasks,
  onAdd,
  onChange,
}: {
  tasks: ReleaseTask[]
  onAdd: () => void
  onChange: (task: ReleaseTask, patch: Partial<ReleaseTask>) => void
}) {
  return (
    <div className="release-panel">
      <div className="panel-header compact">
        <h3>Launch Tasks</h3>
        <button type="button" onClick={onAdd}>
          Neuer Task
        </button>
      </div>
      {!tasks.length && <div className="empty-state">Noch keine Launch Tasks.</div>}
      {tasks.map((task) => (
        <article className="release-task-row" key={task.id}>
          <input value={task.title} onChange={(event) => onChange(task, { title: event.target.value })} />
          <select value={task.status} onChange={(event) => onChange(task, { status: event.target.value as ReleaseTask['status'] })}>
            <option value="open">open</option>
            <option value="done">done</option>
          </select>
          <input value={task.owner} onChange={(event) => onChange(task, { owner: event.target.value })} />
          <input type="date" value={task.dueDate} onChange={(event) => onChange(task, { dueDate: event.target.value })} />
        </article>
      ))}
    </div>
  )
}

function ReleasePartnerLinks({
  links,
  records,
  availablePartners,
  partnerId,
  partnerRole,
  onPartnerChange,
  onRoleChange,
  onAdd,
  onRemove,
}: {
  links: ReleasePartnerLink[]
  records: Manufactory[]
  availablePartners: Manufactory[]
  partnerId: string
  partnerRole: string
  onPartnerChange: (id: string) => void
  onRoleChange: (role: string) => void
  onAdd: () => void
  onRemove: (link: ReleasePartnerLink) => void
}) {
  const partnerOptions = availablePartners.length ? availablePartners : records
  return (
    <div className="release-panel release-partners-card">
      <h3>Partner Links</h3>
      <div className="release-partner-form">
        <select value={partnerId} onChange={(event) => onPartnerChange(event.target.value)}>
          <option value="">Partner wählen</option>
          {partnerOptions.map((record) => (
            <option value={record.id} key={record.id}>
              {record.name}
            </option>
          ))}
        </select>
        <input value={partnerRole} onChange={(event) => onRoleChange(event.target.value)} />
        <button type="button" onClick={onAdd} disabled={!partnerId}>
          Verknüpfen
        </button>
      </div>
      {!links.length && <div className="empty-state">Noch keine Partner verknüpft.</div>}
      {links.map((link) => {
        const record = records.find((item) => item.id === link.partnerId)
        return (
          <article className="release-partner-row" key={`${link.releaseId}-${link.partnerId}`}>
            <div>
              <strong>{record?.name ?? link.partnerId}</strong>
              <span>{link.role || 'Release Partner'}</span>
            </div>
            <button type="button" onClick={() => onRemove(link)}>
              Entfernen
            </button>
          </article>
        )
      })}
    </div>
  )
}

function createRelease(): FashionRelease {
  const now = new Date().toISOString()
  return {
    id: `release-${Date.now()}`,
    name: 'Neue Release',
    season: '',
    launchDate: '',
    status: 'idea',
    summary: '',
    contentStatus: 'not_started',
    readinessNotes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function createTask(releaseId: string): ReleaseTask {
  const now = new Date().toISOString()
  return {
    id: `${releaseId}-task-${Date.now()}`,
    releaseId,
    title: 'Neuer Launch Task',
    status: 'open',
    owner: '',
    dueDate: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function upsertRelease(releases: FashionRelease[], nextRelease: FashionRelease) {
  return releases.some((release) => release.id === nextRelease.id)
    ? releases.map((release) => (release.id === nextRelease.id ? nextRelease : release))
    : [...releases, nextRelease]
}

function upsertTask(tasks: ReleaseTask[], nextTask: ReleaseTask) {
  return tasks.some((task) => task.id === nextTask.id) ? tasks.map((task) => (task.id === nextTask.id ? nextTask : task)) : [...tasks, nextTask]
}

function upsertLink(links: ReleasePartnerLink[], nextLink: ReleasePartnerLink) {
  return links.some((link) => link.releaseId === nextLink.releaseId && link.partnerId === nextLink.partnerId)
    ? links.map((link) => (link.releaseId === nextLink.releaseId && link.partnerId === nextLink.partnerId ? nextLink : link))
    : [...links, nextLink]
}
