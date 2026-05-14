import { describe, expect, it } from 'vitest'
import { clampCount, fashionOsSections, partnerCategories, partnerStatuses } from './index'

describe('Fashion OS shared contracts', () => {
  it('defines the main operating system sections', () => {
    expect(fashionOsSections).toContain('Creative Lab')
    expect(fashionOsSections).toContain('Legal Orientation')
    expect(fashionOsSections).toContain('Web Ops')
  })

  it('keeps partner categories and statuses explicit', () => {
    expect(partnerCategories).toContain('Factory')
    expect(partnerStatuses).toContain('Samples Requested')
  })

  it('clamps AI request counts', () => {
    expect(clampCount(0)).toBe(1)
    expect(clampCount(8)).toBe(8)
    expect(clampCount(99)).toBe(20)
  })
})
