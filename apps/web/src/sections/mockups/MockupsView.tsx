import { useEffect, useMemo, useState } from 'react'
import {
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_QUALITIES,
  type CreativeBrief,
  type FashionRelease,
  type MockupAspectRatio,
  type MockupJob,
  type MockupQuality,
} from '@agorase/shared'
import { listCreativeBriefs } from '../../api/creativeApi'
import { deleteMockupJob, generateMockup, listMockupJobs } from '../../api/mockupsApi'
import { listReleases } from '../../api/releasesApi'
import { PanelHeader } from '../../components/Panel'
import type { FashionOsModule } from '../../fashionOs'

const QUALITY_LABELS: Record<MockupQuality, string> = {
  draft: 'Entwurf',
  standard: 'Standard',
  hi: 'Hi-Q',
}

const STATUS_LABELS: Record<MockupJob['status'], string> = {
  pending: 'Läuft',
  completed: 'Fertig',
  failed: 'Fehlgeschlagen',
}

export function MockupsView({ module }: { module: FashionOsModule }) {
  const [jobs, setJobs] = useState<MockupJob[]>([])
  const [briefs, setBriefs] = useState<CreativeBrief[]>([])
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [aspectRatio, setAspectRatio] = useState<MockupAspectRatio>('1:1')
  const [quality, setQuality] = useState<MockupQuality>('standard')
  const [briefId, setBriefId] = useState('')
  const [releaseId, setReleaseId] = useState('')
  const [notes, setNotes] = useState('')
  const [running, setRunning] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)),
    [jobs],
  )
  const selectedJob =
    sortedJobs.find((job) => job.id === selectedJobId) ?? sortedJobs[0]

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [loadedJobs, loadedBriefs, loadedReleases] = await Promise.all([
          listMockupJobs(),
          listCreativeBriefs(),
          listReleases(),
        ])
        if (!active) return
        setJobs(loadedJobs)
        setBriefs(loadedBriefs)
        setReleases(loadedReleases)
        setSelectedJobId((current) => current || loadedJobs[0]?.id || '')
        setLoadStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setLoadStatus('error')
        setError(caught instanceof Error ? caught.message : 'Mockups konnten nicht geladen werden.')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function runGenerate() {
    const promptValue = prompt.trim()
    if (!promptValue) {
      setError('Bitte gib einen Prompt für das Mockup ein.')
      setLoadStatus('error')
      return
    }
    setRunning(true)
    setError('')
    try {
      const response = await generateMockup({
        prompt: promptValue,
        reference_notes: referenceNotes.trim() || undefined,
        aspect_ratio: aspectRatio,
        quality,
        brief_id: briefId || undefined,
        release_id: releaseId || undefined,
        notes: notes.trim() || undefined,
      })
      setJobs((current) => upsertJob(current, response.job))
      setSelectedJobId(response.job.id)
      if (response.job.status === 'failed' && response.job.error) {
        setError(response.job.error)
        setLoadStatus('error')
      } else {
        setLoadStatus('ready')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mockup konnte nicht generiert werden.')
      setLoadStatus('error')
    } finally {
      setRunning(false)
    }
  }

  async function removeJob(id: string) {
    try {
      await deleteMockupJob(id)
      setJobs((current) => current.filter((job) => job.id !== id))
      if (selectedJobId === id) setSelectedJobId('')
      setError('')
      setLoadStatus('ready')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mockup konnte nicht entfernt werden.')
      setLoadStatus('error')
    }
  }

  return (
    <section className="creative-lab-layout">
      <aside className="creative-lab-workspace panel">
        <PanelHeader title={module.label} />
        {loadStatus === 'loading' && <div className="empty-state">Mockups werden geladen.</div>}
        {error && <div className="error-box">{error}</div>}
        <div className="creative-lab-panel">
          <h3>Neues Mockup</h3>
          <label>
            Prompt
            <textarea
              value={prompt}
              rows={4}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="z. B. SS27 Capsule, ruhige Schichtensilhouetten, tonale Palette"
            />
          </label>
          <label>
            Referenznotizen
            <textarea
              value={referenceNotes}
              rows={3}
              onChange={(event) => setReferenceNotes(event.target.value)}
              placeholder="Stil-, Material- oder Stimmungsreferenzen für das Modell"
            />
          </label>
          <div className="form-grid two">
            <div>
              <span className="field-label">Seitenverhältnis</span>
              <div className="creative-lab-filters">
                {MOCKUP_ASPECT_RATIOS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === aspectRatio ? 'chip selected' : 'chip'}
                    onClick={() => setAspectRatio(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Qualität</span>
              <div className="creative-lab-filters">
                {MOCKUP_QUALITIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === quality ? 'chip selected' : 'chip'}
                    onClick={() => setQuality(value)}
                  >
                    {QUALITY_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-grid two">
            <label>
              Brief
              <select value={briefId} onChange={(event) => setBriefId(event.target.value)}>
                <option value="">Ohne Brief</option>
                {briefs.map((brief) => (
                  <option key={brief.id} value={brief.id}>
                    {brief.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Release
              <select value={releaseId} onChange={(event) => setReleaseId(event.target.value)}>
                <option value="">Ohne Release</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Notizen
            <textarea
              value={notes}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Interne Notizen zum Job"
            />
          </label>
          <button type="button" className="primary-button" disabled={running} onClick={() => void runGenerate()}>
            {running ? 'Generiere…' : 'Mockup generieren'}
          </button>
        </div>
      </aside>

      <aside className="creative-lab-list panel">
        <PanelHeader title="Verlauf" />
        {!sortedJobs.length && <div className="empty-state">Noch keine Mockups generiert.</div>}
        {sortedJobs.map((job) => (
          <button
            key={job.id}
            type="button"
            className={job.id === selectedJob?.id ? 'creative-lab-card selected' : 'creative-lab-card'}
            onClick={() => setSelectedJobId(job.id)}
          >
            <strong>{job.prompt.slice(0, 80) || 'Ohne Prompt'}</strong>
            <span>{STATUS_LABELS[job.status]}</span>
            <small>{`${job.aspectRatio} · ${QUALITY_LABELS[job.quality]}`}</small>
          </button>
        ))}
      </aside>

      <section className="creative-lab-directions panel">
        <PanelHeader title="Detail" />
        {selectedJob ? (
          <MockupDetail job={selectedJob} onDelete={() => void removeJob(selectedJob.id)} />
        ) : (
          <div className="empty-state">Wähle ein Mockup aus dem Verlauf.</div>
        )}
      </section>
    </section>
  )
}

function MockupDetail({ job, onDelete }: { job: MockupJob; onDelete: () => void }) {
  const previewSrc = resolveImageSrc(job)
  return (
    <div className="creative-lab-direction-card saved">
      <div className="panel-header compact">
        <h3>{STATUS_LABELS[job.status]}</h3>
        <button type="button" onClick={onDelete}>
          Löschen
        </button>
      </div>
      {previewSrc ? (
        <img src={previewSrc} alt={job.prompt || 'Mockup'} className="mockup-preview" />
      ) : (
        <div className="empty-state">
          {job.status === 'failed'
            ? job.error || 'Mockup fehlgeschlagen.'
            : 'Noch keine Bilddaten vorhanden.'}
        </div>
      )}
      <p>{job.prompt}</p>
      {job.referenceNotes && <small>Referenzen: {job.referenceNotes}</small>}
      <small>Seitenverhältnis: {job.aspectRatio}</small>
      <small>Qualität: {QUALITY_LABELS[job.quality]}</small>
      <small>Modell: {job.modelUsed || 'Unbekannt'}</small>
      {job.briefId && <small>Brief: {job.briefId}</small>}
      {job.releaseId && <small>Release: {job.releaseId}</small>}
      {job.notes && <small>Notizen: {job.notes}</small>}
      <small>Erstellt: {formatDate(job.createdAt)}</small>
    </div>
  )
}

function resolveImageSrc(job: MockupJob): string {
  if (job.imageUrl) return job.imageUrl
  if (job.imageData) {
    const mime = job.mimeType || 'image/png'
    return `data:${mime};base64,${job.imageData}`
  }
  return ''
}

function formatDate(value: string) {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleString('de-DE')
}

function upsertJob(jobs: MockupJob[], next: MockupJob) {
  return jobs.some((job) => job.id === next.id)
    ? jobs.map((job) => (job.id === next.id ? next : job))
    : [...jobs, next]
}
