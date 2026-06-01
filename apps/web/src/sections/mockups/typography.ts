// Typography presets — visible labels for the picker buttons + the matching freeform
// prompt direction that gets passed to Gemini. Adapted from RHE Fashion Studio.
export const TYPOGRAPHY_PRESETS = [
  'Bold Condensed Sans',
  'Gothic Serif',
  'Varsity Lettering',
  'Minimal Luxury Serif',
  'Handwritten Scripture',
  'Tech Pack Labeling',
] as const

export type TypographyPreset = (typeof TYPOGRAPHY_PRESETS)[number]

export const TYPOGRAPHY_DIRECTIONS: Record<TypographyPreset, string> = {
  'Bold Condensed Sans':
    'bold condensed sans-serif streetwear statement lettering, tall uppercase, tight but readable',
  'Gothic Serif':
    'modern gothic serif lettering, premium spiritual streetwear tone, sharp contrast, readable uppercase',
  'Varsity Lettering':
    'varsity collegiate lettering, athletic streetwear energy, structured outlines, clean readable forms',
  'Minimal Luxury Serif':
    'minimal luxury serif typography, refined spacing, premium fashion label feel, understated print',
  'Handwritten Scripture':
    'handwritten scripture-inspired lettering, human but controlled, expressive without looking messy',
  'Tech Pack Labeling':
    'technical spec sheet typography, clean production labels, measurable placement callouts, no decoration',
}
