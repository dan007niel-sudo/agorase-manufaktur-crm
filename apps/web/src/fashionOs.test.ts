import { describe, expect, it } from 'vitest'
import { fashionOsModules } from './fashionOs'

describe('fashionOsModules', () => {
  it('contains the operating system areas Agorase needs', () => {
    expect(fashionOsModules.map((module) => module.section)).toEqual([
      'Command Center',
      'Sourcing',
      'Partners',
      'Production',
      'Creative Lab',
      'Mockups',
      'Legal Orientation',
      'Releases',
      'Web Ops',
      'Settings',
    ])
  })

  it('marks every live operating-system module as active', () => {
    const liveSections: Array<typeof fashionOsModules[number]['section']> = [
      'Command Center',
      'Sourcing',
      'Partners',
      'Production',
      'Creative Lab',
      'Mockups',
      'Legal Orientation',
      'Releases',
      'Web Ops',
      'Settings',
    ]
    for (const section of liveSections) {
      expect(fashionOsModules.find((module) => module.section === section)?.status).toBe('active')
    }
  })
})
