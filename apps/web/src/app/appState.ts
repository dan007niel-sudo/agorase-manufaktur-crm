import type { Manufactory } from '../types'
import type { FashionOsSection } from '../fashionOs'

export function selectVisibleRecord(records: Manufactory[], selectedId: string) {
  return records.find((record) => record.id === selectedId) ?? records[0]
}

/**
 * The topbar filter row (search, category, status, "Neuer Kontakt") only makes sense for
 * tabs that show partner records. Mockup Studio / Creative Lab / Manufaktur Scout each
 * own their own form UIs and don't read these filters.
 */
export function isTopbarFilterSection(section: FashionOsSection): boolean {
  switch (section) {
    case 'Partners':
      return true
    case 'MockupStudio':
    case 'CreativeLab':
    case 'ManufakturScout':
      return false
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}
