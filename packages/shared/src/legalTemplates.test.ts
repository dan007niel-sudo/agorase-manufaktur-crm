import { describe, expect, it } from 'vitest'
import {
  LEGAL_COUNTRIES,
  LEGAL_NOTE_STATUSES,
  LEGAL_RISK_LEVELS,
  LEGAL_TEMPLATES,
  legalTemplatesByCountry,
} from './index.js'

describe('Legal templates (DACH)', () => {
  it('contains exactly 18 curated templates', () => {
    expect(LEGAL_TEMPLATES.length).toBe(18)
  })

  it('groups templates by country: DE/AT/CH = 6 each, EU = 0', () => {
    expect(legalTemplatesByCountry('DE').length).toBe(6)
    expect(legalTemplatesByCountry('AT').length).toBe(6)
    expect(legalTemplatesByCountry('CH').length).toBe(6)
    expect(legalTemplatesByCountry('EU').length).toBe(0)
  })

  it('exposes the four supported countries', () => {
    expect(LEGAL_COUNTRIES).toEqual(['DE', 'AT', 'CH', 'EU'])
  })

  it('keeps all template ids unique', () => {
    const ids = LEGAL_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('requires title, topic, summary, body, and a defaultNextAction on every template', () => {
    for (const template of LEGAL_TEMPLATES) {
      expect(template.title.trim().length).toBeGreaterThan(0)
      expect(template.topic.trim().length).toBeGreaterThan(0)
      expect(template.summary.trim().length).toBeGreaterThan(0)
      expect(template.body.trim().length).toBeGreaterThan(0)
      expect(template.defaultNextAction.trim().length).toBeGreaterThan(0)
    }
  })

  it('requires at least 3 checklist items and 1 source link per template', () => {
    for (const template of LEGAL_TEMPLATES) {
      expect(template.checklist.length).toBeGreaterThanOrEqual(3)
      expect(template.sourceLinks.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('uses only https:// source links', () => {
    for (const template of LEGAL_TEMPLATES) {
      for (const link of template.sourceLinks) {
        expect(link.startsWith('https://')).toBe(true)
      }
    }
  })

  it('limits defaultRiskLevel to LEGAL_RISK_LEVELS', () => {
    for (const template of LEGAL_TEMPLATES) {
      expect(LEGAL_RISK_LEVELS).toContain(template.defaultRiskLevel)
    }
  })

  it('limits defaultStatus to LEGAL_NOTE_STATUSES', () => {
    for (const template of LEGAL_TEMPLATES) {
      expect(LEGAL_NOTE_STATUSES).toContain(template.defaultStatus)
    }
  })
})
