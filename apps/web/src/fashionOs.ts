import type { FashionOsSection } from '@agorase/shared'

export interface FashionOsModule {
  section: FashionOsSection
  label: string
  shortLabel: string
  summary: string
  status: 'active' | 'foundation' | 'planned'
}

export const fashionOsModules: FashionOsModule[] = [
  {
    section: 'Command Center',
    label: 'Command Center',
    shortLabel: 'Command',
    summary: 'Prioritäten-Überblick für Sourcing, Produktion, Creative, Releases und Web Ops.',
    status: 'active',
  },
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
    section: 'Production',
    label: 'Production',
    shortLabel: 'Production',
    summary: 'Kapazitäten, MOQ, Lieferzeiten, Muster und Kooperations-Reife.',
    status: 'active',
  },
  {
    section: 'Creative Lab',
    label: 'Creative Lab',
    shortLabel: 'Creative',
    summary: 'Brainstorming-Briefs, visuelle Richtung, Capsule-Konzepte und Prompts.',
    status: 'active',
  },
  {
    section: 'Mockups',
    label: 'Mockups',
    shortLabel: 'Mockups',
    summary: 'Bildgenerierung über den API-Server für Garment- und Kampagnen-Visuals.',
    status: 'active',
  },
  {
    section: 'Legal Orientation',
    label: 'Legal Orientation',
    shortLabel: 'Legal',
    summary: 'Risiko-Checklisten und Review-Workflows zur Orientierung ohne Anwalt.',
    status: 'active',
  },
  {
    section: 'Releases',
    label: 'Releases',
    shortLabel: 'Releases',
    summary: 'Drop-Planung, Kollektions-Status, Content-Reife und Launch-Aufgaben.',
    status: 'active',
  },
  {
    section: 'Web Ops',
    label: 'Web Ops',
    shortLabel: 'Web Ops',
    summary: 'Website-Texte, SEO-Notizen, Veröffentlichungs-Aufgaben und Deployment-Reife.',
    status: 'active',
  },
  {
    section: 'Settings',
    label: 'Settings',
    shortLabel: 'Settings',
    summary: 'Provider-Status, Umgebungs-Checks, Datenexport und Diagnose.',
    status: 'active',
  },
]
