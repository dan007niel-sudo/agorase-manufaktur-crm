import type {
  Category,
  FitScore,
  Manufactory,
  PipelineStatus,
  Potential,
  PriceLevel,
  Priority,
} from './types'
import { categories, pipelineStatuses } from './types'

const headerMap: Record<string, keyof Manufactory> = {
  name: 'name',
  'name der manufaktur': 'name',
  manufaktur: 'name',
  ansprechpartner: 'contactPerson',
  kontakt: 'contactPerson',
  kategorie: 'category',
  stadt: 'city',
  region: 'region',
  land: 'country',
  website: 'website',
  'e-mail': 'email',
  email: 'email',
  mail: 'email',
  telefon: 'phone',
  instagram: 'social',
  social: 'social',
  'social media': 'social',
  produkte: 'products',
  preisniveau: 'priceLevel',
  markenfit: 'brandFit',
  kooperationspotenzial: 'cooperationPotential',
  status: 'status',
  priorität: 'priority',
  prioritaet: 'priority',
  quelle: 'source',
  'letzter kontakt': 'lastContact',
  'nächster follow-up': 'nextFollowUp',
  'naechster follow-up': 'nextFollowUp',
  followup: 'nextFollowUp',
  'nächster schritt': 'nextStep',
  'naechster schritt': 'nextStep',
  notizen: 'notes',
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function createEmptyManufacture(name = ''): Manufactory {
  return {
    id: slugify(name || `fashion-kontakt-${Date.now()}`),
    name,
    contactPerson: '',
    category: 'Ready-to-Wear',
    city: '',
    region: '',
    country: '',
    website: '',
    email: '',
    phone: '',
    social: '',
    products: '',
    priceLevel: 'Mittel',
    brandFit: 'B',
    cooperationPotential: 'Mittel',
    status: 'Zu recherchieren',
    priority: 'B',
    source: '',
    lastContact: '',
    nextFollowUp: '',
    nextStep: '',
    notes: '',
  }
}

export function parseBulkImport(input: string): Manufactory[] {
  const rows = input
    .trim()
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)

  if (rows.length < 2) return []

  const separator = rows[0].includes('\t') ? '\t' : ','
  const headers = splitRow(rows[0], separator).map((header) => headerMap[normalizeHeader(header)])

  return rows.slice(1).map((row, index) => {
    const values = splitRow(row, separator)
    const record = createEmptyManufacture()

    headers.forEach((field, fieldIndex) => {
      if (!field) return
      assignField(record, field, values[fieldIndex] ?? '')
    })

    record.id = uniqueId(record.name || `import-${index + 1}`, index)
    return record
  })
}

export function upsertManufacture(records: Manufactory[], nextRecord: Manufactory): Manufactory[] {
  const existingIndex = records.findIndex((record) => record.id === nextRecord.id)
  if (existingIndex === -1) return [...records, nextRecord]

  return records.map((record, index) => (index === existingIndex ? nextRecord : record))
}

function splitRow(row: string, separator: string) {
  return row.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''))
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase()
}

function assignField(record: Manufactory, field: keyof Manufactory, value: string) {
  if (!value) return

  if (field === 'category') {
    record.category = safeCategory(value)
    return
  }

  if (field === 'status') {
    record.status = safeStatus(value)
    return
  }

  if (field === 'priceLevel') {
    record.priceLevel = safeOneOf<PriceLevel>(value, ['Budget', 'Mittel', 'Premium', 'Luxus'], 'Mittel')
    return
  }

  if (field === 'brandFit') {
    record.brandFit = safeOneOf<FitScore>(value, ['A', 'A-', 'B+', 'B', 'C'], 'B')
    return
  }

  if (field === 'cooperationPotential') {
    record.cooperationPotential = safeOneOf<Potential>(value, ['Hoch', 'Mittel', 'Niedrig'], 'Mittel')
    return
  }

  if (field === 'priority') {
    record.priority = safeOneOf<Priority>(value, ['A', 'A-', 'B', 'C'], 'B')
    return
  }

  ;(record[field] as string) = value
}

function safeCategory(value: string): Category {
  return safeOneOf<Category>(value, categories, 'Ready-to-Wear')
}

function safeStatus(value: string): PipelineStatus {
  return safeOneOf<PipelineStatus>(value, pipelineStatuses, 'Zu recherchieren')
}

function safeOneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((item) => item.toLowerCase() === value.toLowerCase()) ?? fallback
}

function uniqueId(name: string, index: number) {
  const slug = slugify(name)
  return `${slug || 'fashion-kontakt'}-${index + 1}`
}
