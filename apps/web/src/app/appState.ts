import type { Manufactory } from '../types'
import type { FashionOsSection } from '../fashionOs'

export function selectVisibleRecord(records: Manufactory[], selectedId: string) {
  return records.find((record) => record.id === selectedId) ?? records[0]
}

export function isTopbarFilterSection(section: FashionOsSection): boolean {
  switch (section) {
    case 'Sourcing':
    case 'Partners':
      return true
    case 'Mockups':
      return false
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}
