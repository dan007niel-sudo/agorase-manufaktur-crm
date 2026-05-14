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
    summary: 'Priority view for sourcing, production, creative, release, and web work.',
    status: 'active',
  },
  {
    section: 'Sourcing',
    label: 'Sourcing',
    shortLabel: 'Sourcing',
    summary: 'European production partner discovery, scoring, and research imports.',
    status: 'active',
  },
  {
    section: 'Partners',
    label: 'Partners',
    shortLabel: 'Partners',
    summary: 'Supplier, atelier, factory, material, and service partner records.',
    status: 'active',
  },
  {
    section: 'Production',
    label: 'Production',
    shortLabel: 'Production',
    summary: 'Capabilities, MOQ, lead time, samples, and collaboration readiness.',
    status: 'foundation',
  },
  {
    section: 'Creative Lab',
    label: 'Creative Lab',
    shortLabel: 'Creative',
    summary: 'Brainstorming briefs, visual direction, capsule concepts, and prompts.',
    status: 'foundation',
  },
  {
    section: 'Mockups',
    label: 'Mockups',
    shortLabel: 'Mockups',
    summary: 'Server-routed image generation workspace for garment and campaign visuals.',
    status: 'planned',
  },
  {
    section: 'Legal Orientation',
    label: 'Legal Orientation',
    shortLabel: 'Legal',
    summary: 'Risk checklists and review workflows for non-lawyer orientation.',
    status: 'foundation',
  },
  {
    section: 'Releases',
    label: 'Releases',
    shortLabel: 'Releases',
    summary: 'Drop planning, collection state, content readiness, and launch tasks.',
    status: 'foundation',
  },
  {
    section: 'Web Ops',
    label: 'Web Ops',
    shortLabel: 'Web Ops',
    summary: 'Website copy, SEO notes, publishing tasks, and deployment readiness.',
    status: 'foundation',
  },
  {
    section: 'Settings',
    label: 'Settings',
    shortLabel: 'Settings',
    summary: 'Provider status, environment expectations, data export, and diagnostics.',
    status: 'foundation',
  },
]
