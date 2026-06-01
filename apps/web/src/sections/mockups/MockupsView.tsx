import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MOCKUP_ALLOWED_REFERENCE_MIME_TYPES,
  MOCKUP_ASPECT_RATIOS,
  MOCKUP_IMAGE_MODES,
  MOCKUP_MAX_REFERENCES,
  MOCKUP_MAX_REFERENCE_BYTES,
  MOCKUP_PRODUCT_MODES,
  MOCKUP_QUALITIES,
  MOCKUP_REFERENCE_KINDS,
  type MockupAspectRatio,
  type MockupImageMode,
  type MockupJob,
  type MockupPrintFields,
  type MockupProductMode,
  type MockupQuality,
  type MockupReference,
  type MockupReferenceKind,
} from '@agorase/shared'
import {
  deleteMockupJob,
  downloadMockupJob,
  generateMockup,
  listMockupJobs,
} from '../../api/mockupsApi'
import { PanelHeader } from '../../components/Panel'
import { TYPOGRAPHY_DIRECTIONS, TYPOGRAPHY_PRESETS, type TypographyPreset } from './typography'

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

const REFERENCE_KIND_LABELS: Record<MockupReferenceKind, string> = {
  style: 'Style',
  sketch: 'Skizze',
  reference: 'Referenz',
}

// Props let a sibling tab (Creative Lab) seed the Mockup-Studio prompt without losing tab state.
// Calling `onPromptConsumed` clears the parent's "pending" prompt so it does not re-apply.
export interface MockupsViewProps {
  pendingPrompt?: string
  onPromptConsumed?: () => void
}

export function MockupsView({ pendingPrompt, onPromptConsumed }: MockupsViewProps = {}) {
  const [jobs, setJobs] = useState<MockupJob[]>([])
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [aspectRatio, setAspectRatio] = useState<MockupAspectRatio>('1:1')
  const [quality, setQuality] = useState<MockupQuality>('standard')
  const [notes, setNotes] = useState('')
  const [references, setReferences] = useState<MockupReference[]>([])
  const [running, setRunning] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // RHE-style fashion-spec fields
  const [productMode, setProductMode] = useState<MockupProductMode | ''>('')
  const [imageMode, setImageMode] = useState<MockupImageMode | ''>('')
  const [garmentColor, setGarmentColor] = useState('')
  const [fabric, setFabric] = useState('')
  const [printMethod, setPrintMethod] = useState('')
  const [placement, setPlacement] = useState('')
  const [designText, setDesignText] = useState('')
  const [typographyPreset, setTypographyPreset] = useState<TypographyPreset | ''>('')
  const [typographyFreeform, setTypographyFreeform] = useState('')
  const [printFields, setPrintFields] = useState<MockupPrintFields>({
    front: '',
    back: '',
    sleeve: '',
    printSizeCm: '',
  })

  // Cross-tab prompt handoff (Creative Lab → Mockup Studio). React 19 / react-hooks lint
  // forbids both setState-in-effect and ref mutation during render. The clean pattern is
  // `useState` with a "last seen prop" tracker stored as plain state — when the prop
  // changes between renders, React calls setState during render (allowed) and immediately
  // re-renders with the new value, no effect needed.
  const [lastSeenPrompt, setLastSeenPrompt] = useState(pendingPrompt ?? '')
  if (pendingPrompt && pendingPrompt !== lastSeenPrompt) {
    setLastSeenPrompt(pendingPrompt)
    if (pendingPrompt.trim() && pendingPrompt !== prompt) {
      setPrompt(pendingPrompt)
    }
  }
  useEffect(() => {
    if (pendingPrompt && pendingPrompt === lastSeenPrompt && pendingPrompt.trim()) {
      onPromptConsumed?.()
    }
  }, [pendingPrompt, lastSeenPrompt, onPromptConsumed])

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
        const loadedJobs = await listMockupJobs()
        if (!active) return
        setJobs(loadedJobs)
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
        notes: notes.trim() || undefined,
        reference_images: references.length ? references : undefined,
        product_mode: productMode || undefined,
        image_mode: imageMode || undefined,
        garment_color: garmentColor.trim() || undefined,
        fabric: fabric.trim() || undefined,
        print_method: printMethod.trim() || undefined,
        placement: placement.trim() || undefined,
        design_text: designText.trim() || undefined,
        typography_preset: typographyPreset || undefined,
        typography_freeform: typographyFreeform.trim() || undefined,
        print_fields: printFields,
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
    if (!window.confirm('Mockup wirklich löschen?')) return
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

  async function downloadJob(id: string) {
    try {
      await downloadMockupJob(id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mockup konnte nicht heruntergeladen werden.')
      setLoadStatus('error')
    }
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || !files.length) return
    const remaining = MOCKUP_MAX_REFERENCES - references.length
    if (remaining <= 0) return
    const accepted: MockupReference[] = []
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!(MOCKUP_ALLOWED_REFERENCE_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError('Nur PNG, JPEG oder WebP.')
        setLoadStatus('error')
        continue
      }
      if (file.size > MOCKUP_MAX_REFERENCE_BYTES) {
        setError('Maximal 2 MB pro Datei.')
        setLoadStatus('error')
        continue
      }
      try {
        const data = await readFileAsBase64(file)
        accepted.push({
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          data,
          mimeType: file.type,
          kind: 'reference',
        })
      } catch {
        setError('Datei konnte nicht gelesen werden.')
        setLoadStatus('error')
      }
    }
    if (accepted.length) {
      setReferences((current) => [...current, ...accepted].slice(0, MOCKUP_MAX_REFERENCES))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeReference(id: string) {
    setReferences((current) => current.filter((ref) => ref.id !== id))
  }

  function updateReferenceKind(id: string, kind: MockupReferenceKind) {
    setReferences((current) =>
      current.map((ref) => (ref.id === id ? { ...ref, kind } : ref)),
    )
  }

  function moveReference(id: string, direction: -1 | 1) {
    setReferences((current) => {
      const index = current.findIndex((ref) => ref.id === id)
      if (index === -1) return current
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) return current
      const next = current.slice()
      const tmp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = tmp
      return next
    })
  }

  const hasJobs = sortedJobs.length > 0
  const layoutClassName = hasJobs
    ? 'creative-lab-layout'
    : 'creative-lab-layout mockups-layout--solo'

  return (
    <section className={layoutClassName}>
      <aside className="creative-lab-workspace panel">
        <PanelHeader title="Mockups" />
        {loadStatus === 'loading' && <div className="empty-state">Mockups werden geladen.</div>}
        {error && <div className="error-box">{error}</div>}
        <div className="creative-lab-panel">
          <h3>Neues Mockup</h3>
          <div>
            <span className="field-label">Produkt</span>
            <div className="creative-lab-filters">
              {MOCKUP_PRODUCT_MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === productMode ? 'chip selected' : 'chip'}
                  aria-pressed={value === productMode}
                  onClick={() => setProductMode(value === productMode ? '' : value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Bildmodus</span>
            <div className="creative-lab-filters">
              {MOCKUP_IMAGE_MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === imageMode ? 'chip selected' : 'chip'}
                  aria-pressed={value === imageMode}
                  onClick={() => setImageMode(value === imageMode ? '' : value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid two">
            <label>
              Garment-Farbe
              <input
                value={garmentColor}
                onChange={(event) => setGarmentColor(event.target.value)}
                placeholder="z. B. Washed Black"
              />
            </label>
            <label>
              Print-Verfahren
              <input
                value={printMethod}
                onChange={(event) => setPrintMethod(event.target.value)}
                placeholder="z. B. Screenprint, DTG, Stickerei"
              />
            </label>
          </div>
          <label>
            Stoff / GSM
            <input
              value={fabric}
              onChange={(event) => setFabric(event.target.value)}
              placeholder="z. B. 420 GSM brushed cotton fleece"
            />
          </label>
          <label>
            Placement
            <input
              value={placement}
              onChange={(event) => setPlacement(event.target.value)}
              placeholder="z. B. linke Brust + grosser Rueckenprint"
            />
          </label>
          <label>
            Design-Text
            <input
              value={designText}
              onChange={(event) => setDesignText(event.target.value)}
              placeholder="Exakter Text, z. B. KINGS DON'T RUN"
            />
          </label>
          <div>
            <span className="field-label">Typografie-Preset</span>
            <div className="creative-lab-filters">
              {TYPOGRAPHY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={preset === typographyPreset ? 'chip selected' : 'chip'}
                  aria-pressed={preset === typographyPreset}
                  onClick={() => {
                    if (preset === typographyPreset) {
                      setTypographyPreset('')
                      setTypographyFreeform('')
                    } else {
                      setTypographyPreset(preset)
                      setTypographyFreeform(TYPOGRAPHY_DIRECTIONS[preset])
                    }
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <label>
            Typografie-Direction
            <input
              value={typographyFreeform}
              onChange={(event) => setTypographyFreeform(event.target.value)}
              placeholder="z. B. bold condensed streetwear lettering, uppercase"
            />
          </label>
          <div className="form-grid two">
            <label>
              Print Front
              <input
                value={printFields.front}
                onChange={(event) => setPrintFields((current) => ({ ...current, front: event.target.value }))}
                placeholder="z. B. 10 cm Höhe, links Brust"
              />
            </label>
            <label>
              Print Back
              <input
                value={printFields.back}
                onChange={(event) => setPrintFields((current) => ({ ...current, back: event.target.value }))}
                placeholder="z. B. 30 cm Höhe, zentriert"
              />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Print Ärmel
              <input
                value={printFields.sleeve}
                onChange={(event) => setPrintFields((current) => ({ ...current, sleeve: event.target.value }))}
                placeholder="optional"
              />
            </label>
            <label>
              Print-Grösse (cm)
              <input
                value={printFields.printSizeCm}
                onChange={(event) => setPrintFields((current) => ({ ...current, printSizeCm: event.target.value }))}
                placeholder="z. B. 30 × 40"
              />
            </label>
          </div>
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
          <div className="mockup-references">
            <span className="field-label">Referenzbilder ({references.length}/{MOCKUP_MAX_REFERENCES})</span>
            <div className="mockup-reference-grid">
              {references.map((ref, index) => (
                <div key={ref.id} className="mockup-reference-slot filled">
                  <img
                    src={`data:${ref.mimeType};base64,${ref.data}`}
                    alt={ref.name}
                    className="mockup-reference-thumb"
                  />
                  <div className="mockup-reference-meta">
                    <span className="mockup-reference-name" title={ref.name}>{ref.name}</span>
                    <label className="mockup-reference-kind">
                      Art
                      <select
                        value={ref.kind}
                        onChange={(event) =>
                          updateReferenceKind(ref.id, event.target.value as MockupReferenceKind)
                        }
                      >
                        {MOCKUP_REFERENCE_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {REFERENCE_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mockup-reference-order">
                      <button
                        type="button"
                        aria-label="Referenz nach oben verschieben"
                        disabled={index === 0}
                        onClick={() => moveReference(ref.id, -1)}
                      >↑</button>
                      <button
                        type="button"
                        aria-label="Referenz nach unten verschieben"
                        disabled={index === references.length - 1}
                        onClick={() => moveReference(ref.id, 1)}
                      >↓</button>
                    </div>
                    <button
                      type="button"
                      className="mockup-reference-remove"
                      onClick={() => removeReference(ref.id)}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
              {references.length < MOCKUP_MAX_REFERENCES && (
                <label className="mockup-reference-slot empty">
                  <span>Referenz hinzufügen</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Referenzbild hinzufügen"
                    onChange={(event) => void onFilesSelected(event.target.files)}
                  />
                </label>
              )}
            </div>
            <small>PNG, JPEG oder WebP, max. 2 MB pro Datei.</small>
          </div>
          <div className="form-grid two">
            <div>
              <span className="field-label">Seitenverhältnis</span>
              <div className="creative-lab-filters">
                {MOCKUP_ASPECT_RATIOS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={value === aspectRatio ? 'chip selected' : 'chip'}
                    aria-pressed={value === aspectRatio}
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
                    aria-pressed={value === quality}
                    onClick={() => setQuality(value)}
                  >
                    {QUALITY_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
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

      {hasJobs && (
        <aside className="creative-lab-list panel">
          <PanelHeader title="Verlauf" />
          {sortedJobs.map((job) => (
            <div
              key={job.id}
              className={job.id === selectedJob?.id ? 'creative-lab-card selected' : 'creative-lab-card'}
            >
              <button
                type="button"
                className="creative-lab-card-body"
                onClick={() => setSelectedJobId(job.id)}
              >
                <strong>{job.prompt.slice(0, 80) || 'Ohne Prompt'}</strong>
                <span>{STATUS_LABELS[job.status]}</span>
                <small>{`${job.aspectRatio} · ${QUALITY_LABELS[job.quality]}`}</small>
                {job.qualityReport && (
                  <small>{`Score ${job.qualityReport.score}/100`}</small>
                )}
                {job.referenceImages.length > 0 && (
                  <div className="mockup-reference-strip">
                    {job.referenceImages.slice(0, MOCKUP_MAX_REFERENCES).map((ref) => (
                      <img
                        key={ref.id}
                        src={`data:${ref.mimeType};base64,${ref.data}`}
                        alt={ref.name}
                        className="mockup-reference-strip-thumb"
                      />
                    ))}
                  </div>
                )}
              </button>
              {job.status === 'completed' && (
                <button
                  type="button"
                  className="mockup-download-button"
                  onClick={() => void downloadJob(job.id)}
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </aside>
      )}

      {hasJobs && (
        <section className="creative-lab-directions panel">
          <PanelHeader title="Detail" />
          {selectedJob ? (
            <MockupDetail
              job={selectedJob}
              onDelete={() => void removeJob(selectedJob.id)}
              onDownload={() => void downloadJob(selectedJob.id)}
            />
          ) : (
            <div className="empty-state">Wähle ein Mockup aus dem Verlauf.</div>
          )}
        </section>
      )}
    </section>
  )
}

function MockupDetail({
  job,
  onDelete,
  onDownload,
}: {
  job: MockupJob
  onDelete: () => void
  onDownload: () => void
}) {
  const previewSrc = resolveImageSrc(job)
  const canDownload = job.status === 'completed' && Boolean(job.imageUrl || job.imageData)
  return (
    <div className="creative-lab-direction-card saved">
      <div className="panel-header compact">
        <h3>{STATUS_LABELS[job.status]}</h3>
        <div className="mockup-detail-actions">
          {canDownload && (
            <button type="button" className="primary-button" onClick={onDownload}>
              Download
            </button>
          )}
          <button type="button" onClick={onDelete}>
            Löschen
          </button>
        </div>
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
      {job.referenceImages.length > 0 && (
        <div className="mockup-reference-detail">
          <span className="field-label">Referenzbilder</span>
          <div className="mockup-reference-detail-row">
            {job.referenceImages.map((ref) => (
              <figure key={ref.id} className="mockup-reference-detail-item">
                <img
                  src={`data:${ref.mimeType};base64,${ref.data}`}
                  alt={ref.name}
                  className="mockup-reference-detail-thumb"
                />
                <figcaption>{REFERENCE_KIND_LABELS[ref.kind]}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      {job.qualityReport && (
        <div className="mockup-quality-report">
          <div className="mockup-quality-header">
            <strong>{job.qualityReport.score}/100</strong>
            <span className={`quality-badge ${job.qualityReport.status}`}>
              {job.qualityReport.status === 'ready'
                ? 'verwendbar'
                : job.qualityReport.status === 'blocked'
                  ? 'blockiert'
                  : 'prüfen'}
            </span>
          </div>
          <p>{job.qualityReport.summary}</p>
          {job.qualityReport.checks.length > 0 && (
            <ul className="mockup-quality-checks">
              {job.qualityReport.checks.slice(0, 5).map((check) => (
                <li key={check.label}>
                  <span className={`check-dot ${check.status}`} aria-hidden="true" />
                  <strong>{check.label}</strong>
                  <small>{check.note}</small>
                </li>
              ))}
            </ul>
          )}
          {job.qualityReport.recommendations.length > 0 && (
            <small>Empfehlung: {job.qualityReport.recommendations.join(' · ')}</small>
          )}
        </div>
      )}
      {job.productMode && <small>Produkt: {job.productMode}</small>}
      {job.imageMode && <small>Bildmodus: {job.imageMode}</small>}
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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}
