import { describe, expect, it } from 'vitest'
import { fashionOsModules } from './fashionOs'

describe('fashionOsModules', () => {
  it('lists the four active workflow sections in RHE order (produce → ideate → source → pipeline)', () => {
    expect(fashionOsModules.map((module) => module.section)).toEqual([
      'MockupStudio',
      'CreativeLab',
      'ManufakturScout',
      'Partners',
    ])
  })

  it('uses RHE labels for the visible tab names', () => {
    expect(fashionOsModules.map((module) => module.label)).toEqual([
      'Mockup Studio',
      'Creative Lab',
      'Manufaktur Scout',
      'Partners',
    ])
  })

  it('marks every module as active', () => {
    for (const module of fashionOsModules) {
      expect(module.status).toBe('active')
    }
  })
})
