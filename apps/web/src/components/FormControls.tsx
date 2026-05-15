import { useState } from 'react'
import { categories, pipelineStatuses, type Manufactory } from '../types'
import { PanelHeader } from './Panel'

export function RecordForm({
  initialRecord,
  onCancel,
  onSave,
}: {
  initialRecord: Manufactory
  onCancel: () => void
  onSave: (record: Manufactory) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(initialRecord)

  function patch(field: keyof Manufactory, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="modal-backdrop">
      <form
        className="record-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave({ ...draft, id: draft.id || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
        }}
      >
        <PanelHeader title={draft.id ? 'Fashion-Kontakt bearbeiten' : 'Neuer Fashion-Kontakt'} />
        <div className="form-grid">
          <Field label="Name" value={draft.name} onChange={(value) => patch('name', value)} />
          <Field label="Ansprechpartner" value={draft.contactPerson} onChange={(value) => patch('contactPerson', value)} />
          <label>
            Kategorie
            <select value={draft.category} onChange={(event) => patch('category', event.target.value)}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <Field label="Stadt" value={draft.city} onChange={(value) => patch('city', value)} />
          <Field label="Land" value={draft.country} onChange={(value) => patch('country', value)} />
          <Field label="Website" value={draft.website} onChange={(value) => patch('website', value)} />
          <Field label="E-Mail" value={draft.email} onChange={(value) => patch('email', value)} />
          <Field label="Telefon" value={draft.phone} onChange={(value) => patch('phone', value)} />
          <Field label="Social" value={draft.social} onChange={(value) => patch('social', value)} />
          <Field label="Produkte" value={draft.products} onChange={(value) => patch('products', value)} />
          <label>
            Status
            <select value={draft.status} onChange={(event) => patch('status', event.target.value)}>
              {pipelineStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <Field label="Nächster Schritt" value={draft.nextStep} onChange={(value) => patch('nextStep', value)} />
        </div>
        <label>
          Notizen
          <textarea value={draft.notes} onChange={(event) => patch('notes', event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="primary-button">
            Speichern
          </button>
        </div>
      </form>
    </div>
  )
}

export function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
