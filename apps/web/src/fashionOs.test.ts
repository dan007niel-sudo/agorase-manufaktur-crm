import { describe, expect, it } from 'vitest'
import { fashionOsModules } from './fashionOs'

describe('fashionOsModules', () => {
  it('lists the three active workflow sections in workflow order', () => {
    expect(fashionOsModules.map((module) => module.section)).toEqual([
      'Sourcing',
      'Partners',
      'Mockups',
    ])
  })

  it('marks every module as active', () => {
    for (const module of fashionOsModules) {
      expect(module.status).toBe('active')
    }
  })
})
