import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AppShell } from './app/AppShell'
import { AuthGate } from './app/AuthGate'
import {
  resetStoredStateFromQuery,
  storageKeys,
  useAdminAuth,
  useLocalState,
  type RecordsStatus,
} from './app/authState'
import { RecordForm } from './components/FormControls'
import { seedManufactories } from './data'
import { calculateMetrics, createEmptyManufacture, deriveTasks, upsertManufacture } from './crmUtils'
import { fashionOsModules, type FashionOsModule } from './fashionOs'
import { importPartners, listPartners, savePartner, updatePartner } from './api/partnersApi'
import { CommandCenter } from './sections/command/CommandCenter'
import { WorkspaceFoundation } from './sections/foundation/WorkspaceFoundation'
import { PartnersView } from './sections/partners/PartnersView'
import { ProductionView } from './sections/production/ProductionView'
import { SettingsView } from './sections/settings/SettingsView'
import { SourcingView } from './sections/sourcing/SourcingView'
import type { Category, CrmTask, Manufactory, PipelineStatus } from './types'

type Section = FashionOsModule['section']

function App() {
  resetStoredStateFromQuery()

  const { authStatus, authError, handleLogin, handleLogout } = useAdminAuth()
  const [activeSection, setActiveSection] = useState<Section>('Command Center')
  const [records, setRecords] = useState<Manufactory[]>(seedManufactories)
  const [recordsStatus, setRecordsStatus] = useState<RecordsStatus>('loading')
  const [recordsError, setRecordsError] = useState('')
  const [completedTasks, setCompletedTasks] = useLocalState<string[]>(storageKeys.completedTasks, [])
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'Alle' | Category>('Alle')
  const [statusFilter, setStatusFilter] = useState<'Alle' | PipelineStatus>('Alle')
  const [formOpen, setFormOpen] = useState(false)

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0]
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

  const today = '2026-05-14'
  const metrics = calculateMetrics(records, today)
  const tasks = deriveTasks(records, today).map((task) => ({
    ...task,
    completed: completedTasks.includes(task.id),
  }))
  const activeModule = fashionOsModules.find((module) => module.section === activeSection) ?? fashionOsModules[0]

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let active = true

    async function loadRecords() {
      try {
        const loaded = await listPartners()
        if (!active) return
        const nextRecords = loaded.length ? loaded : seedManufactories
        setRecords(nextRecords)
        setSelectedId((current) => current || nextRecords[0]?.id || '')
        setRecordsStatus('ready')
        setRecordsError('')
      } catch (caught) {
        if (!active) return
        setRecords(seedManufactories)
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

  async function updateSelectedRecord(patch: Partial<Manufactory>) {
    if (!selectedRecord) return
    try {
      const updated = await updatePartner(selectedRecord.id, patch)
      setRecords((current) => upsertManufacture(current, updated))
      setSelectedId(updated.id)
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnte nicht aktualisiert werden.')
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
      setActiveSection('Partners')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht importiert werden.')
    }
  }

  async function saveSeedRecords() {
    try {
      const saved = await importPartners(seedManufactories)
      setRecords(saved)
      setSelectedId(saved[0]?.id ?? '')
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsStatus('error')
      setRecordsError(caught instanceof Error ? caught.message : 'Seed-Daten konnten nicht gespeichert werden.')
    }
  }

  function toggleTask(task: CrmTask) {
    setCompletedTasks((current) =>
      current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
    )
  }

  return (
    <AuthGate status={authStatus} error={authError} onLogin={handleLogin}>
      <AppShell
        activeSection={activeSection}
        activeModule={activeModule}
        openTasks={metrics.openTasks}
        query={query}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        onSectionChange={setActiveSection}
        onQueryChange={setQuery}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        onAdd={() => {
          setSelectedId('')
          setFormOpen(true)
        }}
        alert={recordsStatus === 'error' ? 'Partnerdaten konnten nicht synchronisiert werden.' : undefined}
      >
        {activeSection === 'Command Center' && (
          <CommandCenter
            metrics={metrics}
            records={records}
            tasks={tasks}
            onSelectRecord={setSelectedId}
            onSectionChange={setActiveSection}
            onToggleTask={toggleTask}
          />
        )}
        {activeSection === 'Sourcing' && (
          <SourcingView onAiImport={saveImportedRecords} onBulkImport={saveImportedRecords} />
        )}
        {activeSection === 'Partners' && (
          <PartnersView
            records={filteredRecords}
            selectedRecord={selectedRecord}
            onSelect={setSelectedId}
            onEdit={() => setFormOpen(true)}
            onPatch={updateSelectedRecord}
          />
        )}
        {activeSection === 'Production' && (
          <ProductionView module={activeModule} records={filteredRecords} onSelect={setSelectedId} onPatch={saveRecord} />
        )}
        {activeSection === 'Creative Lab' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Mockups' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Legal Orientation' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Releases' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Web Ops' && <WorkspaceFoundation module={activeModule} />}
        {activeSection === 'Settings' && (
          <SettingsView
            status={
              recordsStatus === 'error'
                ? recordsError
                : recordsStatus === 'loading'
                  ? 'Partnerdaten werden geladen.'
                  : 'Partnerdaten werden über die API synchronisiert.'
            }
            onSeedSave={saveSeedRecords}
            onLogout={handleLogout}
          />
        )}
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
