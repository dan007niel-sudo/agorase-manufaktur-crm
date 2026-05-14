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

  it('marks visible foundation modules without pretending everything is complete', () => {
    expect(fashionOsModules.find((module) => module.section === 'Mockups')?.status).toBe('planned')
    expect(fashionOsModules.find((module) => module.section === 'Sourcing')?.status).toBe('active')
  })
})
