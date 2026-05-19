import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AppShell } from './app/AppShell'
import { AuthGate } from './app/AuthGate'
import { formatLocalDate, selectVisibleRecord } from './app/appState'
import {
  resetStoredStateFromQuery,
  useAdminAuth,
  type RecordsStatus,
} from './app/authState'
import { RecordForm } from './components/FormControls'
import { seedManufactories } from './data'
import { calculateMetrics, createEmptyManufacture, deriveTasks, upsertManufacture } from './crmUtils'
import { fashionOsModules, type FashionOsModule } from './fashionOs'
import { listCreativeBriefs, listCreativeDirections } from './api/creativeApi'
import { listLegalNotes } from './api/legalApi'
import { listMockupJobs } from './api/mockupsApi'
import { deletePartner, importPartners, listPartners, savePartner, updatePartner } from './api/partnersApi'
import { listProductionProfiles } from './api/productionApi'
import { listReleases, listReleaseTasks } from './api/releasesApi'
import { listTasks, saveTask } from './api/tasksApi'
import { listWebOpsItems } from './api/webOpsApi'
import { CommandCenter } from './sections/command/CommandCenter'
import { CreativeLabView } from './sections/creativeLab/CreativeLabView'
import { createCreativeCommandTasks } from './sections/creativeLab/creativeTasks'
import { LegalView } from './sections/legal/LegalView'
import { createLegalCommandTasks } from './sections/legal/legalTasks'
import { MockupsView } from './sections/mockups/MockupsView'
import { createMockupCommandTasks } from './sections/mockups/mockupTasks'
import { PartnersView } from './sections/partners/PartnersView'
import { ProductionView } from './sections/production/ProductionView'
import { ReleasesView } from './sections/releases/ReleasesView'
import { createReleaseLaunchTasks } from './sections/releases/releaseTasks'
import { SettingsView } from './sections/settings/SettingsView'
import { SourcingView } from './sections/sourcing/SourcingView'
import { WebOpsView } from './sections/webOps/WebOpsView'
import { createWebOpsCommandTasks } from './sections/webOps/webOpsTasks'
import type {
  CreativeBrief,
  CreativeDirection,
  FashionRelease,
  LegalNote,
  MockupJob,
  OperationalTask,
  ProductionProfile,
  ReleaseTask,
  WebOpsItem,
} from '@agorase/shared'
import type { Category, CrmTask, Manufactory, PipelineStatus } from './types'

type Section = FashionOsModule['section']

function App() {
  resetStoredStateFromQuery()

  const { authStatus, authError, handleLogin, handleLogout } = useAdminAuth()
  const [activeSection, setActiveSection] = useState<Section>('Command Center')
  const [records, setRecords] = useState<Manufactory[]>([])
  const [recordsStatus, setRecordsStatus] = useState<RecordsStatus>('loading')
  const [recordsError, setRecordsError] = useState('')
  const [persistedTasks, setPersistedTasks] = useState<OperationalTask[]>([])
  const [productionProfiles, setProductionProfiles] = useState<ProductionProfile[]>([])
  const [releases, setReleases] = useState<FashionRelease[]>([])
  const [releaseTasks, setReleaseTasks] = useState<ReleaseTask[]>([])
  const [webOpsItems, setWebOpsItems] = useState<WebOpsItem[]>([])
  const [creativeBriefs, setCreativeBriefs] = useState<CreativeBrief[]>([])
  const [creativeDirections, setCreativeDirections] = useState<CreativeDirection[]>([])
  const [mockupJobs, setMockupJobs] = useState<MockupJob[]>([])
  const [legalNotes, setLegalNotes] = useState<LegalNote[]>([])
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

  const today = formatLocalDate(new Date())
  const metrics = calculateMetrics(records, today)
  const persistedTasksById = useMemo(() => new Map(persistedTasks.map((task) => [task.id, task])), [persistedTasks])
  const tasks = deriveTasks(records, today)
    .map((task) => ({
      ...task,
      completed: persistedTasksById.get(task.id)?.status === 'done',
    }))
    .concat(createProductionBlockerTasks(productionProfiles, records, persistedTasksById))
    .concat(createReleaseLaunchTasks(releaseTasks, persistedTasksById, today))
    .concat(createWebOpsCommandTasks(webOpsItems, persistedTasksById, today))
    .concat(
      createCreativeCommandTasks({
        briefs: creativeBriefs,
        directions: creativeDirections,
        releases,
        persistedTasksById,
        today,
      }),
    )
    .concat(
      createMockupCommandTasks({
        jobs: mockupJobs,
        persistedTasksById,
        now: new Date().toISOString(),
      }),
    )
    .concat(createLegalCommandTasks(legalNotes, persistedTasksById, today))
  const openTaskCount = tasks.filter((task) => !task.completed).length
  const activeModule = fashionOsModules.find((module) => module.section === activeSection) ?? fashionOsModules[0]
  const filterSections: Section[] = ['Command Center', 'Sourcing', 'Partners']
  const filtersVisible = filterSections.includes(activeSection)

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
        try {
          const [
            loadedTasks,
            loadedProfiles,
            loadedReleases,
            loadedReleaseTasks,
            loadedWebOpsItems,
            loadedCreativeBriefs,
            loadedCreativeDirections,
            loadedMockupJobs,
            loadedLegalNotes,
          ] = await Promise.all([
            listTasks(),
            listProductionProfiles(),
            listReleases(),
            listReleaseTasks(),
            listWebOpsItems(),
            listCreativeBriefs(),
            listCreativeDirections(),
            listMockupJobs(),
            listLegalNotes(),
          ])
          if (active) {
            setPersistedTasks(loadedTasks)
            setProductionProfiles(loadedProfiles)
            setReleases(loadedReleases)
            setReleaseTasks(loadedReleaseTasks)
            setWebOpsItems(loadedWebOpsItems)
            setCreativeBriefs(loadedCreativeBriefs)
            setCreativeDirections(loadedCreativeDirections)
            setMockupJobs(loadedMockupJobs)
            setLegalNotes(loadedLegalNotes)
          }
        } catch (caught) {
          if (!active) return
          setRecordsError(caught instanceof Error ? caught.message : 'Tasks konnten nicht geladen werden.')
          setRecordsStatus('error')
        }
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

  const selectedPartnerRecord = selectVisibleRecord(filteredRecords, selectedId)

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

  async function toggleTask(task: CrmTask) {
    const nextTask = toOperationalTask(task, persistedTasksById.get(task.id))
    try {
      const saved = await saveTask({ ...nextTask, status: task.completed ? 'open' : 'done' })
      setPersistedTasks((current) => upsertTask(current, saved))
      setRecordsStatus('ready')
      setRecordsError('')
    } catch (caught) {
      setRecordsError(caught instanceof Error ? caught.message : 'Task konnte nicht gespeichert werden.')
      setRecordsStatus('error')
    }
  }

  return (
    <AuthGate status={authStatus} error={authError} onLogin={handleLogin}>
      <AppShell
        activeSection={activeSection}
        activeModule={activeModule}
        openTasks={openTaskCount}
        query={query}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        filtersVisible={filtersVisible}
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
        )}
        {activeSection === 'Production' && (
          <ProductionView module={activeModule} records={filteredRecords} onSelect={setSelectedId} onPatch={saveRecord} />
        )}
        {activeSection === 'Creative Lab' && <CreativeLabView module={activeModule} />}
        {activeSection === 'Mockups' && <MockupsView module={activeModule} />}
        {activeSection === 'Legal Orientation' && <LegalView module={activeModule} />}
        {activeSection === 'Releases' && <ReleasesView module={activeModule} records={filteredRecords} />}
        {activeSection === 'Web Ops' && <WebOpsView module={activeModule} />}
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

function createProductionBlockerTasks(
  profiles: ProductionProfile[],
  records: Manufactory[],
  persistedTasksById: Map<string, OperationalTask>,
): CrmTask[] {
  return profiles
    .filter((profile) => profile.readinessStatus === 'blocked' && profile.blocker)
    .map((profile) => {
      const record = records.find((item) => item.id === profile.partnerId)
      const id = `${profile.partnerId}-production-blocker`
      return {
        id,
        manufactureId: profile.partnerId,
        title: `Production Blocker: ${record?.name ?? profile.partnerId}`,
        dueDate: '',
        urgency: 'today' as const,
        completed: persistedTasksById.get(id)?.status === 'done',
      }
    })
}

function toOperationalTask(task: CrmTask, existing?: OperationalTask): OperationalTask {
  const now = new Date().toISOString()
  return {
    id: task.id,
    title: task.title,
    section: 'Command Center',
    status: existing?.status ?? (task.completed ? 'done' : 'open'),
    priority: task.urgency === 'upcoming' ? 'medium' : 'high',
    partnerId: task.manufactureId,
    dueDate: task.dueDate,
    notes: existing?.notes ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function upsertTask(tasks: OperationalTask[], nextTask: OperationalTask) {
  return tasks.some((task) => task.id === nextTask.id)
    ? tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
    : [...tasks, nextTask]
}

export default App
