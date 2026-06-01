export type FashionOsSection = 'MockupStudio' | 'CreativeLab' | 'ManufakturScout' | 'Partners'

export interface FashionOsModule {
  section: FashionOsSection
  label: string
  shortLabel: string
  summary: string
  status: 'active'
}

// Order matches RHE Fashion Studio: produce-first (Mockup Studio), then ideate (Creative Lab),
// then source (Manufaktur Scout), with Partners staying as the persisted CRM pipeline tab.
export const fashionOsModules: FashionOsModule[] = [
  {
    section: 'MockupStudio',
    label: 'Mockup Studio',
    shortLabel: 'Mockups',
    summary: 'Produktionsreife Garment-Mockups mit Typografie, Print-Spezifikation und Qualitäts-Check.',
    status: 'active',
  },
  {
    section: 'CreativeLab',
    label: 'Creative Lab',
    shortLabel: 'Creative',
    summary: 'Drop-Konzepte mit Story, Palette und Mockup-Prompt direkt in die Pipeline.',
    status: 'active',
  },
  {
    section: 'ManufakturScout',
    label: 'Manufaktur Scout',
    shortLabel: 'Scout',
    summary: 'KI-Recherche mit Score und Verifikationsstatus pro Kontakt-Feld.',
    status: 'active',
  },
  {
    section: 'Partners',
    label: 'Partners',
    shortLabel: 'Partners',
    summary: 'Übernommene Manufakturen, Ateliers und Service-Partner als CRM-Pipeline.',
    status: 'active',
  },
]
