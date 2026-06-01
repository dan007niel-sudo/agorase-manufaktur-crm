import { describe, expect, it } from 'vitest'
import type { ResearchVerification } from '@agorase/shared'
import {
  buildFallbackMockupReport,
  buildResearchQualityGate,
  findSupportingSource,
  normalizeMockupQualityReport,
  toScore,
  toSources,
  toTextArray,
  verifyField,
} from './quality.js'

describe('toTextArray', () => {
  it('returns trimmed strings from arrays', () => {
    expect(toTextArray(['Cotton', ' Hemp ', ''])).toEqual(['Cotton', 'Hemp'])
  })
  it('splits comma-separated strings', () => {
    expect(toTextArray('Cotton, Hemp; Linen')).toEqual(['Cotton', 'Hemp', 'Linen'])
  })
  it('returns [] for null/undefined', () => {
    expect(toTextArray(null)).toEqual([])
    expect(toTextArray(undefined)).toEqual([])
  })
  it('flattens object values', () => {
    expect(toTextArray({ a: 'one', b: ['two', 'three'] })).toEqual(['one', 'two', 'three'])
  })
})

describe('toScore', () => {
  it('clamps numbers to 1-100', () => {
    expect(toScore(150, 50)).toBe(100)
    expect(toScore(-10, 50)).toBe(1)
    expect(toScore(72, 50)).toBe(72)
  })
  it('parses string numbers', () => {
    expect(toScore('80', 50)).toBe(80)
  })
  it('falls back when not a number', () => {
    expect(toScore('abc', 42)).toBe(42)
    expect(toScore(NaN, 42)).toBe(42)
  })
})

describe('toSources', () => {
  it('normalizes URL with title', () => {
    const out = toSources([{ title: 'Web', url: 'example.com' }])
    expect(out).toEqual([{ title: 'Web', url: 'https://example.com' }])
  })
  it('falls back to URL when title is missing', () => {
    const out = toSources([{ url: 'https://example.com' }])
    expect(out[0]?.title).toBe('https://example.com')
  })
  it('drops sources without URL', () => {
    expect(toSources([{ title: 'orphan' }, null, 'string'])).toEqual([])
  })
})

describe('findSupportingSource', () => {
  it('returns the source whose domain matches the value', () => {
    const sources = [
      { url: 'https://docs.example.org/about' },
      { url: 'https://factory.de/contact' },
    ]
    expect(findSupportingSource('hello@factory.de', sources)).toBe('https://factory.de/contact')
  })

  // The RHE lesson: previously the first source was returned for any value, so an
  // email was marked verified just because *some* source existed.
  it('returns empty string when no source domain matches the value', () => {
    const sources = [{ url: 'https://docs.example.org/about' }]
    expect(findSupportingSource('hello@somewhere-else.com', sources)).toBe('')
  })

  it('handles empty value/sources', () => {
    expect(findSupportingSource('', [{ url: 'https://x.com' }])).toBe('')
    expect(findSupportingSource('hello@x.com', [])).toBe('')
  })
})

describe('verifyField', () => {
  it('marks fields with matching source as verified', () => {
    const sources = [{ url: 'https://atelier-nordwear.de' }]
    const field = verifyField('hello@atelier-nordwear.de', 'email', sources)
    expect(field.status).toBe('verified')
    expect(field.sourceUrl).toBe('https://atelier-nordwear.de')
  })

  it('marks plausible values without matching source as partial', () => {
    const field = verifyField('hello@something-else.com', 'email', [
      { url: 'https://docs.example.org' },
    ])
    expect(field.status).toBe('partial')
  })

  it('marks placeholder text as unverified', () => {
    const field = verifyField('nicht verifiziert', 'email', [])
    expect(field.status).toBe('unverified')
    expect(field.value).toBe('nicht verifiziert')
  })
})

describe('buildResearchQualityGate', () => {
  const baseVerification: ResearchVerification = {
    address: { value: '', status: 'verified', confidence: 88, sourceUrl: 'https://x.com', note: '' },
    website: { value: '', status: 'partial', confidence: 70, sourceUrl: '', note: '' },
    contactPage: { value: '', status: 'partial', confidence: 70, sourceUrl: '', note: '' },
    email: { value: '', status: 'partial', confidence: 45, sourceUrl: '', note: '' },
    phone: { value: '', status: 'unverified', confidence: 10, sourceUrl: '', note: '' },
    contactPerson: { value: '', status: 'unverified', confidence: 10, sourceUrl: '', note: '' },
  }

  it('produces ready status when all signals are strong', () => {
    const gate = buildResearchQualityGate(
      {
        name: 'Atelier',
        country: 'Portugal',
        sources: [{ title: 'a', url: 'https://a' }, { title: 'b', url: 'https://b' }],
        capabilities: ['knit', 'print', 'dye'],
        moq: '200',
        samplingSpeed: '2 weeks',
      },
      baseVerification,
    )
    expect(gate.score).toBeGreaterThanOrEqual(75)
    expect(gate.status).toBe('ready')
  })

  it('returns warnings when signals are weak', () => {
    const weak: ResearchVerification = {
      ...baseVerification,
      address: { ...baseVerification.address, status: 'unverified' },
      website: { ...baseVerification.website, status: 'unverified' },
      email: { ...baseVerification.email, status: 'unverified' },
      phone: { ...baseVerification.phone, status: 'unverified' },
    }
    const gate = buildResearchQualityGate(
      {
        name: 'Atelier',
        country: 'Portugal',
        sources: [],
        capabilities: [],
        moq: 'auf Anfrage',
        samplingSpeed: 'auf Anfrage',
      },
      weak,
    )
    expect(gate.warnings.length).toBeGreaterThan(0)
    expect(gate.score).toBeLessThan(60)
  })
})

describe('buildFallbackMockupReport', () => {
  it('returns a structured report when the AI image-qa call cannot run', () => {
    const report = buildFallbackMockupReport({
      productMode: 'Hoodie',
      imageMode: 'Tech Pack View',
      fabric: '420 GSM cotton',
      placement: 'left chest + big back print',
      prompt: 'RHE style streetwear hoodie with confident lettering for SS27 drop',
      designText: 'KINGS',
      typographyDirection: 'bold condensed sans-serif lettering',
    })
    expect(report.checks.length).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.score).toBeGreaterThan(0)
  })
})

describe('normalizeMockupQualityReport', () => {
  it('keeps a well-formed model output', () => {
    const report = normalizeMockupQualityReport(
      {
        score: 82,
        status: 'ready',
        summary: 'Solid mockup',
        checks: [{ label: 'Fit', status: 'ready', note: 'good proportions' }],
        recommendations: ['Push contrast'],
      },
      {
        productMode: 'Hoodie',
        imageMode: 'Model-Shot',
        fabric: '',
        placement: '',
        prompt: '',
        designText: '',
        typographyDirection: '',
      },
    )
    expect(report.score).toBe(82)
    expect(report.status).toBe('ready')
    expect(report.checks).toHaveLength(1)
  })

  it('falls back to heuristic checks when AI returns no checks', () => {
    const report = normalizeMockupQualityReport(
      { score: 40 },
      {
        productMode: 'Hoodie',
        imageMode: 'Model-Shot',
        fabric: '420 GSM',
        placement: 'left chest + big back print',
        prompt: 'RHE style streetwear hoodie with confident lettering for SS27 drop',
        designText: 'KINGS',
        typographyDirection: 'bold condensed lettering',
      },
    )
    expect(report.checks.length).toBeGreaterThan(0)
  })
})
