export type FashionOsSection = 'Sourcing' | 'Partners' | 'Mockups'

export interface FashionOsModule {
  section: FashionOsSection
  label: string
  shortLabel: string
  summary: string
  status: 'active'
}

export const fashionOsModules: FashionOsModule[] = [
  {
    section: 'Sourcing',
    label: 'Sourcing',
    shortLabel: 'Sourcing',
    summary: 'Europäische Produktionspartner finden, bewerten und Research-Ergebnisse importieren.',
    status: 'active',
  },
  {
    section: 'Partners',
    label: 'Partners',
    shortLabel: 'Partners',
    summary: 'Lieferanten-, Atelier-, Fabrik-, Material- und Service-Partner.',
    status: 'active',
  },
  {
    section: 'Mockups',
    label: 'Mockups',
    shortLabel: 'Mockups',
    summary: 'Bildgenerierung über den API-Server für Garment- und Kampagnen-Visuals.',
    status: 'active',
  },
]
