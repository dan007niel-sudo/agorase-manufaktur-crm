import { describe, expect, it } from 'vitest'
import { buildAiResearchPrompt, parseAiResearchResponse, suggestionToManufacture } from './aiResearch'

describe('buildAiResearchPrompt', () => {
  it('turns research criteria into an Agorase-specific search brief', () => {
    const prompt = buildAiResearchPrompt({
      categories: ['Streetwear', 'Ready-to-Wear'],
      regions: 'DACH, Norditalien',
      productFocus: 'zeitgenoessische Streetwear und Accessoires',
      priceLevel: 'Premium',
      count: 8,
    })

    expect(prompt).toContain('Agorase')
    expect(prompt).toContain('Streetwear, Ready-to-Wear')
    expect(prompt).toContain('DACH, Norditalien')
    expect(prompt).toContain('8 passende Fashion-Manufakturen')
  })
})

describe('parseAiResearchResponse', () => {
  it('extracts structured suggestions from Responses API output_text', () => {
    const parsed = parseAiResearchResponse({
      output_text: JSON.stringify({
        suggestions: [
          {
            name: 'Atelier Forma',
            contactPerson: 'Lena Hart',
            category: 'Ready-to-Wear',
            city: 'Köln',
            region: 'NRW',
            country: 'Deutschland',
            website: 'https://forma.example',
            email: 'hello@forma.example',
            phone: '',
            social: '@atelierforma',
            products: 'Overshirts und Utility Pants',
            priceLevel: 'Premium',
            brandFit: 'A',
            cooperationPotential: 'Hoch',
            priority: 'A',
            source: 'Websuche',
            nextStep: 'Line Sheet prüfen',
            notes: 'Sehr klare Silhouette',
            confidence: 86,
            rationale: 'Passt zur Agorase Fashion-Aesthetik',
            sources: [{ title: 'Atelier Forma', url: 'https://forma.example' }],
          },
        ],
      }),
    })

    expect(parsed[0]).toMatchObject({
      name: 'Atelier Forma',
      category: 'Ready-to-Wear',
      confidence: 86,
      sources: [{ title: 'Atelier Forma', url: 'https://forma.example' }],
    })
  })
})

describe('suggestionToManufacture', () => {
  it('converts an AI suggestion into a CRM record ready to import', () => {
    const record = suggestionToManufacture({
      name: 'Atelier Forma',
      contactPerson: '',
      category: 'Ready-to-Wear',
      city: 'Köln',
      region: 'NRW',
      country: 'Deutschland',
      website: 'https://forma.example',
      email: '',
      phone: '',
      social: '@atelierforma',
      products: 'Overshirts und Utility Pants',
      priceLevel: 'Premium',
      brandFit: 'A',
      cooperationPotential: 'Hoch',
      priority: 'A',
      source: 'KI-Recherche',
      nextStep: 'Line Sheet prüfen',
      notes: 'Sehr klare Silhouette',
      confidence: 86,
      rationale: 'Passt zur Agorase Fashion-Aesthetik',
      sources: [{ title: 'Atelier Forma', url: 'https://forma.example' }],
    })

    expect(record).toMatchObject({
      id: 'ki-atelier-forma',
      name: 'Atelier Forma',
      status: 'Recherchiert',
      source: 'KI-Recherche',
      nextStep: 'Line Sheet prüfen',
    })
    expect(record.notes).toContain('KI-Begründung')
    expect(record.notes).toContain('https://forma.example')
  })
})
