import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AppShell } from './app/AppShell'
import { AuthGate } from './app/AuthGate'
import { isTopbarFilterSection, selectVisibleRecord } from './app/appState'
import {
  resetStoredStateFromQuery,
  useAdminAuth,
  type RecordsStatus,
} from './app/authState'
import { RecordForm } from './components/FormControls'
import { createEmptyManufacture, upsertManufacture } from './crmUtils'
import type { FashionOsSection } from './fashionOs'
import { deletePartner, importPartners, listPartners, savePartner, updatePartner } from './api/partnersApi'
import { CreativeLabView } from './sections/creativeLab/CreativeLabView'
import { MockupsView } from './sections/mockups/MockupsView'
import { PartnersView } from './sections/partners/PartnersView'
import { SourcingView } from './sections/sourcing/SourcingView'
import type { Category, Manufactory, PipelineStatus } from './types'

function App() {
  resetStoredStateFromQuery()

  const { authStatus, authError, handleLogin, handleLogout } = useAdminAuth()

  // Tab state — single source of truth for which view is visible.
  // Default to Mockup Studio (the produce-first RHE entry point).
  const [activeSection, setActiveSection] = useState<FashionOsSection>('MockupStudio')

  // Partners cluster — owned here because Sourcing imports records into the same store.
  const [records, setRecords] = useState<Manufactory[]>([])
  const [recordsStatus, setRecordsStatus] = useState<RecordsStatus>('loading')
  const [recordsError, setRecordsError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Alle' | Category>('Alle')
  const [statusFilter, setStatusFilter] = useState<'Alle' | PipelineStatus>('Alle')
  const [formOpen, setFormOpen] = useState(false)

  // Cross-tab handoff: Creative Lab generates a prompt → Mockup Studio reads it on next render.
  // The Mockup Studio view calls `onPromptConsumed` after applying the prompt so we don't
  // overwrite the user's edits on subsequent tab toggles.
  const [pendingMockupPrompt, setPendingMockupPrompt] = useState('')

  // Sourcing / Mockups / Creative-Lab each own their internal state inside their views.
  // All four panels stay permanently mounted and are toggled via the `hidden`
  // attribute so internal state survives tab switches.

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return records.filter((record) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          record.name,
          record.contactPerson,
          record.category,
          record.city,
          record.region,
          record.country,
          record.source,
          record.products,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      const matchesCategory = categoryFilter === 'Alle' || record.category === categoryFilter
      const matchesStatus = statusFilter === 'Alle' || record.status === statusFilter
      return matchesQuery && matchesCategory && matchesStatus
    })
  }, [records, query, categoryFilter, statusFilter])

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0]
  const selectedPartnerRecord = selectVisibleRecord(filteredRecords, selectedId)
  const filtersVisible = isTopbarFilterSection(activeSection)

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let active = true

    async function loadRecords() {
      try {
        const loaded = await listPartners()
        if (!active) return
        setRecords(loaded)
        setSelectedId((current) => current || loaded[0]?.id || '')
        setRecordsStatus('ready')
        setRecordsError('')
      } catch (caught) {
        if (!active) return
        setRecords([])
        setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht geladen werden.')
        setRecordsStatus('error')
      }
    }

    void loadRecords()
    return () => {
      active = false
    }
  }, [authStatus])

  async function saveRecord(nextRecord: Manufactory) {
    try {
      const saved = await savePartner(nextRecord)
      setRecords((current) => upsertManufacture(current, saved))
      setSelectedId(saved.id)
      setFormOpen(false)
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht gespeichert werden.')
    }
  }

  async function updateRecord(id: string, patch: Partial<Manufactory>) {
    try {
      const updated = await updatePartner(id, patch)
      setRecords((current) => upsertManufacture(current, updated))
      setSelectedId(updated.id)
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht aktualisiert werden.')
    }
  }

  async function removeRecord(id: string) {
    try {
      await deletePartner(id)
      setRecords((current) => {
        const next = current.filter((record) => record.id !== id)
        setSelectedId((currentId) => (currentId === id ? next[0]?.id ?? '' : currentId))
        return next
      })
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht gelöscht werden.')
    }
  }

  async function saveImportedRecords(newRecords: Manufactory[]) {
    try {
      const saved = await importPartners(newRecords)
      setRecords((current) => saved.reduce((next, record) => upsertManufacture(next, record), current))
      if (saved[0]) setSelectedId(saved[0].id)
      setQuery('')
      setCategoryFilter('Alle')
      setStatusFilter('Alle')
      setRecordsStatus('ready')
      setRecordsError('')
      changeSection('Partners')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht importiert werden.')
    }
  }

  function changeSection(section: FashionOsSection) {
    setActiveSection(section)
    setFormOpen(false)
  }

  function sendPromptToMockupStudio(prompt: string) {
    setPendingMockupPrompt(prompt)
    changeSection('MockupStudio')
  }

  return (
    <AuthGate status={authStatus} error={authError} onLogin={handleLogin}>
      <AppShell
        activeSection={activeSection}
        openTasks={0}
        query={query}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        filtersVisible={filtersVisible}
        onSectionChange={changeSection}
        onQueryChange={setQuery}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        onAdd={() => {
          setSelectedId('')
          setFormOpen(true)
        }}
        onLogout={handleLogout}
        alert={
          recordsStatus === 'error'
            ? recordsError || 'Partnerdaten konnten nicht synchronisiert werden.'
            : undefined
        }
      >
        <div
          id="tabpanel-mockupstudio"
          role="tabpanel"
          aria-labelledby="tab-mockupstudio"
          hidden={activeSection !== 'MockupStudio'}
        >
          <MockupsView
            pendingPrompt={pendingMockupPrompt}
            onPromptConsumed={() => setPendingMockupPrompt('')}
          />
        </div>
        <div
          id="tabpanel-creativelab"
          role="tabpanel"
          aria-labelledby="tab-creativelab"
          hidden={activeSection !== 'CreativeLab'}
        >
          <CreativeLabView onSendToMockupStudio={sendPromptToMockupStudio} />
        </div>
        <div
          id="tabpanel-manufakturscout"
          role="tabpanel"
          aria-labelledby="tab-manufakturscout"
          hidden={activeSection !== 'ManufakturScout'}
        >
          <SourcingView onAiImport={saveImportedRecords} onBulkImport={saveImportedRecords} />
        </div>
        <div
          id="tabpanel-partners"
          role="tabpanel"
          aria-labelledby="tab-partners"
          hidden={activeSection !== 'Partners'}
        >
          <PartnersView
            records={filteredRecords}
            selectedRecord={selectedPartnerRecord}
            onSelect={setSelectedId}
            onEdit={() => {
              if (selectedPartnerRecord) setSelectedId(selectedPartnerRecord.id)
              setFormOpen(true)
            }}
            onPatch={(patch) => {
              if (selectedPartnerRecord) void updateRecord(selectedPartnerRecord.id, patch)
            }}
            onDelete={removeRecord}
          />
        </div>
      </AppShell>
      {formOpen && (
        <RecordForm
          initialRecord={selectedId && selectedRecord ? selectedRecord : createEmptyManufacture()}
          onCancel={() => setFormOpen(false)}
          onSave={saveRecord}
        />
      )}
    </AuthGate>
  )
}

export default App
