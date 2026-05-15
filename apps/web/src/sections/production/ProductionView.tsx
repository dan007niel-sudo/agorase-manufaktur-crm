import { useEffect, useMemo, useState } from 'react'
import type { ProductionProfile, SampleRequest } from '@agorase/shared'
import {
  deleteSampleRequest,
  listProductionProfiles,
  listSampleRequests,
  saveProductionProfile,
  saveSampleRequest,
} from '../../api/productionApi'
import { groupByStatus } from '../../crmUtils'
import type { FashionOsModule } from '../../fashionOs'
import { pipelineStatuses, type Manufactory, type PipelineStatus } from '../../types'
import { PanelHeader } from '../../components/Panel'

export function ProductionView({
  module,
  records,
  onSelect,
  onPatch,
}: {
  module: FashionOsModule
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
}) {
  const [profiles, setProfiles] = useState<ProductionProfile[]>([])
  const [samples, setSamples] = useState<SampleRequest[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState(records[0]?.id ?? '')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const effectiveSelectedPartnerId = selectedPartnerId || records[0]?.id || ''
  const selectedRecord = records.find((record) => record.id === effectiveSelectedPartnerId) ?? records[0]
  const selectedProfile = useMemo(
    () => createProfile(selectedRecord?.id ?? '', profiles.find((profile) => profile.partnerId === selectedRecord?.id)),
    [profiles, selectedRecord?.id],
  )
  const selectedSamples = samples.filter((sample) => sample.partnerId === selectedRecord?.id)

  useEffect(() => {
    let active = true

    async function loadProduction() {
      try {
        const [loadedProfiles, loadedSamples] = await Promise.all([listProductionProfiles(), listSampleRequests()])
        if (!active) return
        setProfiles(loadedProfiles)
        setSamples(loadedSamples)
        setStatus('ready')
        setError('')
      } catch (caught) {
        if (!active) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Produktionsdaten konnten nicht geladen werden.')
      }
    }

    void loadProduction()
    return () => {
      active = false
    }
  }, [])

  async function updateProfile(patch: Partial<ProductionProfile>) {
    if (!selectedRecord) return
    const saved = await saveProductionProfile({ ...selectedProfile, ...patch, partnerId: selectedRecord.id })
    setProfiles((current) => upsertProfile(current, saved))
  }

  async function addSample() {
    if (!selectedRecord) return
    const saved = await saveSampleRequest(createSample(selectedRecord.id))
    setSamples((current) => upsertSample(current, saved))
  }

  async function updateSample(sample: SampleRequest, patch: Partial<SampleRequest>) {
    const saved = await saveSampleRequest({ ...sample, ...patch })
    setSamples((current) => upsertSample(current, saved))
  }

  async function removeSample(id: string) {
    await deleteSampleRequest(id)
    setSamples((current) => current.filter((sample) => sample.id !== id))
  }

  const blockedProfiles = profiles.filter((profile) => profile.readinessStatus === 'blocked')

  return (
    <section className="production-layout">
      <PipelineView
        records={records}
        onSelect={(id) => {
          setSelectedPartnerId(id)
          onSelect(id)
        }}
        onPatch={onPatch}
      />
      <section className="production-workspace panel">
        <PanelHeader title={module.label} />
        {status === 'error' && <div className="error-box">{error}</div>}
        <div className="production-summary">
          <div>
            <span className="label">Partner</span>
            <strong>{selectedRecord?.name ?? 'Kein Partner ausgewählt'}</strong>
          </div>
          <div>
            <span className="label">Readiness</span>
            <strong>{selectedProfile.readinessScore}%</strong>
          </div>
          <div>
            <span className="label">Blocker</span>
            <strong>{blockedProfiles.length}</strong>
          </div>
        </div>
        {selectedRecord && (
          <div className="production-detail-grid">
            <ProfileEditor profile={selectedProfile} onChange={(patch) => void updateProfile(patch)} />
            <ReadinessPanel profile={selectedProfile} onChange={(patch) => void updateProfile(patch)} />
            <SampleTracker
              samples={selectedSamples}
              onAdd={() => void addSample()}
              onUpdate={(sample, patch) => void updateSample(sample, patch)}
              onDelete={(id) => void removeSample(id)}
            />
          </div>
        )}
      </section>
    </section>
  )
}

function PipelineView({
  records,
  onSelect,
  onPatch,
}: {
  records: Manufactory[]
  onSelect: (id: string) => void
  onPatch: (record: Manufactory) => void
}) {
  return (
    <section className="pipeline-board">
      {groupByStatus(records)
        .filter((group) => group.records.length > 0)
        .map((group) => (
          <div className="pipeline-column" key={group.status}>
            <div className="column-title">
              <strong>{group.status}</strong>
              <span>{group.records.length}</span>
            </div>
            {group.records.map((record) => (
              <article className="pipeline-card" key={record.id} onClick={() => onSelect(record.id)}>
                <strong>{record.name}</strong>
                <span>{record.category}</span>
                <small>{record.nextStep || 'Nächsten Schritt festlegen'}</small>
                <select
                  value={record.status}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onPatch({ ...record, status: event.target.value as PipelineStatus })}
                >
                  {pipelineStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        ))}
    </section>
  )
}

function ProfileEditor({
  profile,
  onChange,
}: {
  profile: ProductionProfile
  onChange: (patch: Partial<ProductionProfile>) => void
}) {
  return (
    <div className="production-card">
      <h3>Capabilities</h3>
      <Field label="Capabilities" value={profile.capabilities} onChange={(value) => onChange({ capabilities: value })} />
      <Field label="Materialien" value={profile.materials} onChange={(value) => onChange({ materials: value })} />
      <div className="form-grid two">
        <Field label="MOQ" value={profile.moq} onChange={(value) => onChange({ moq: value })} />
        <Field label="Lead Time" value={profile.leadTime} onChange={(value) => onChange({ leadTime: value })} />
      </div>
      <Field label="Zertifizierungen" value={profile.certifications} onChange={(value) => onChange({ certifications: value })} />
      <Field label="Kosten" value={profile.costNotes} onChange={(value) => onChange({ costNotes: value })} />
      <Field label="Qualität" value={profile.qualityNotes} onChange={(value) => onChange({ qualityNotes: value })} />
    </div>
  )
}

function ReadinessPanel({
  profile,
  onChange,
}: {
  profile: ProductionProfile
  onChange: (patch: Partial<ProductionProfile>) => void
}) {
  return (
    <div className="production-card">
      <h3>Readiness</h3>
      <label>
        Status
        <select
          value={profile.readinessStatus}
          onChange={(event) => onChange({ readinessStatus: event.target.value as ProductionProfile['readinessStatus'] })}
        >
          <option value="unknown">unknown</option>
          <option value="blocked">blocked</option>
          <option value="review">review</option>
          <option value="ready">ready</option>
        </select>
      </label>
      <label>
        Score
        <input
          type="number"
          min="0"
          max="100"
          value={profile.readinessScore}
          onChange={(event) => onChange({ readinessScore: Number(event.target.value) })}
        />
      </label>
      <label>
        Blocker
        <textarea value={profile.blocker} onChange={(event) => onChange({ blocker: event.target.value })} />
      </label>
    </div>
  )
}

function SampleTracker({
  samples,
  onAdd,
  onUpdate,
  onDelete,
}: {
  samples: SampleRequest[]
  onAdd: () => void
  onUpdate: (sample: SampleRequest, patch: Partial<SampleRequest>) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="production-card samples-card">
      <div className="panel-header compact">
        <h3>Samples</h3>
        <button type="button" onClick={onAdd}>
          Neues Sample
        </button>
      </div>
      {!samples.length && <div className="empty-state">Noch keine Sample Requests.</div>}
      {samples.map((sample) => (
        <article className="sample-row" key={sample.id}>
          <input value={sample.title} onChange={(event) => onUpdate(sample, { title: event.target.value })} />
          <select
            value={sample.status}
            onChange={(event) => onUpdate(sample, { status: event.target.value as SampleRequest['status'] })}
          >
            <option value="planned">planned</option>
            <option value="requested">requested</option>
            <option value="received">received</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <input type="date" value={sample.targetDate} onChange={(event) => onUpdate(sample, { targetDate: event.target.value })} />
          <input value={sample.costEstimate} onChange={(event) => onUpdate(sample, { costEstimate: event.target.value })} />
          <button type="button" onClick={() => onDelete(sample.id)}>
            Löschen
          </button>
        </article>
      ))}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function createProfile(partnerId: string, existing?: ProductionProfile): ProductionProfile {
  return (
    existing ?? {
      partnerId,
      capabilities: '',
      materials: '',
      moq: '',
      leadTime: '',
      certifications: '',
      costNotes: '',
      qualityNotes: '',
      readinessStatus: 'unknown',
      readinessScore: 0,
      blocker: '',
      updatedAt: new Date().toISOString(),
    }
  )
}

function createSample(partnerId: string): SampleRequest {
  const now = new Date().toISOString()
  return {
    id: `${partnerId}-sample-${Date.now()}`,
    partnerId,
    title: 'Neues Sample',
    status: 'planned',
    requestedAt: '',
    targetDate: '',
    costEstimate: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

function upsertProfile(profiles: ProductionProfile[], nextProfile: ProductionProfile) {
  return profiles.some((profile) => profile.partnerId === nextProfile.partnerId)
    ? profiles.map((profile) => (profile.partnerId === nextProfile.partnerId ? nextProfile : profile))
    : [...profiles, nextProfile]
}

function upsertSample(samples: SampleRequest[], nextSample: SampleRequest) {
  return samples.some((sample) => sample.id === nextSample.id)
    ? samples.map((sample) => (sample.id === nextSample.id ? nextSample : sample))
    : [...samples, nextSample]
}
