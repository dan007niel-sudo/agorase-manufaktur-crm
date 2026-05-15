import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAiResearchPrompt, parseAiResearchResponse, requestAiManufactories, suggestionToManufacture } from './aiResearch'

afterEach(() => {
  vi.restoreAllMocks()
})

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
  it('extracts structured suggestions from legacy output_text payloads', () => {
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

  it('accepts the internal research API suggestion envelope', () => {
    const parsed = parseAiResearchResponse({
      suggestions: [
        {
          name: 'Studio Nadel',
          contactPerson: '',
          category: 'Tailoring',
          city: 'Berlin',
          region: 'Berlin',
          country: 'Deutschland',
          website: 'https://studio-nadel.example',
          email: '',
          phone: '',
          social: '',
          products: 'Small-batch tailoring',
          priceLevel: 'Luxus',
          brandFit: 'A-',
          cooperationPotential: 'Hoch',
          priority: 'A',
          source: '',
          nextStep: '',
          notes: '',
          confidence: 78,
          rationale: 'Strong production fit',
          sources: [],
        },
      ],
    })

    expect(parsed[0]).toMatchObject({
      name: 'Studio Nadel',
      source: 'KI-Recherche',
      nextStep: 'Line Sheet oder Wholesale-Kontakt prüfen',
    })
  })
})

describe('requestAiManufactories', () => {
  it('uses the Render-compatible trailing slash research endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await requestAiManufactories({
      criteria: {
        categories: [],
        regions: 'Portugal',
        productFocus: 'premium knitwear',
        priceLevel: 'Premium',
        count: 1,
      },
    })

    expect(fetchSpy).toHaveBeenCalledWith('/api/research/partners/', expect.objectContaining({ credentials: 'include' }))
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
