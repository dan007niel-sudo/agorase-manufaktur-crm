type InspirationTheme =
  | 'Fleiß'
  | 'Vision'
  | 'Weisheit'
  | 'Segen'
  | 'Mut'
  | 'Verantwortung'
  | 'Geduld'
  | 'Treue'

export interface DailyInspiration {
  reference: string
  translation: 'SCH2000'
  theme: InspirationTheme
  excerpt: string
  reflection: string
  action: string
}

export const dailyInspirations: DailyInspiration[] = [
  {
    reference: 'Sprüche 16,3',
    translation: 'SCH2000',
    theme: 'Vision',
    excerpt: 'Befiehl dem HERRN deine Werke',
    reflection: 'Große Pläne werden ruhiger, wenn sie zuerst Gott hingelegt werden.',
    action: 'Heute: den wichtigsten Schritt klar benennen und konsequent beginnen.',
  },
  {
    reference: 'Kolosser 3,23',
    translation: 'SCH2000',
    theme: 'Fleiß',
    excerpt: 'Alles, was ihr tut, das tut von Herzen',
    reflection: 'Exzellente Arbeit ist auch dann wertvoll, wenn sie noch niemand sieht.',
    action: 'Heute: eine Aufgabe ohne Ablenkung sauber abschließen.',
  },
  {
    reference: 'Sprüche 21,5',
    translation: 'SCH2000',
    theme: 'Weisheit',
    excerpt: 'Die Pläne des Fleißigen führen nur zum Gewinn',
    reflection: 'Wachstum entsteht nicht aus Hektik, sondern aus geordnetem, treuem Handeln.',
    action: 'Heute: einen Plan in konkrete nächste Schritte übersetzen.',
  },
  {
    reference: 'Josua 1,9',
    translation: 'SCH2000',
    theme: 'Mut',
    excerpt: 'Sei stark und mutig',
    reflection: 'Mut bedeutet, den nächsten richtigen Schritt trotz offener Fragen zu gehen.',
    action: 'Heute: eine Entscheidung treffen, die schon zu lange offen ist.',
  },
  {
    reference: 'Psalm 90,17',
    translation: 'SCH2000',
    theme: 'Segen',
    excerpt: 'Fördern wolle das Werk unserer Hände',
    reflection: 'Arbeit braucht Können, aber auch Gnade, Timing und offene Türen.',
    action: 'Heute: für das Werk beten und dann praktisch handeln.',
  },
  {
    reference: 'Lukas 16,10',
    translation: 'SCH2000',
    theme: 'Treue',
    excerpt: 'Wer im Geringsten treu ist',
    reflection: 'Die kleinen, verlässlichen Schritte tragen die großen Ziele.',
    action: 'Heute: eine unsichtbare, aber wichtige Pflicht ordentlich erledigen.',
  },
  {
    reference: 'Sprüche 11,25',
    translation: 'SCH2000',
    theme: 'Segen',
    excerpt: 'Eine segnende Seele wird reichlich gesättigt',
    reflection: 'Wohlstand ist stärker, wenn er mit Großzügigkeit und Verantwortung verbunden bleibt.',
    action: 'Heute: eine Entscheidung so treffen, dass sie auch anderen dient.',
  },
  {
    reference: 'Galater 6,9',
    translation: 'SCH2000',
    theme: 'Geduld',
    excerpt: 'Lasst uns aber im Gutestun nicht müde werden',
    reflection: 'Frucht braucht Ausdauer; nicht jeder gute Samen zeigt sofort Ergebnis.',
    action: 'Heute: an einer guten Sache dranbleiben, statt neu anzufangen.',
  },
]

export function getTimeGreeting(date: Date, name: string) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return `Guten Morgen, ${name}.`
  if (hour >= 12 && hour < 14) return `Guten Mittag, ${name}.`
  if (hour >= 14 && hour < 18) return `Guten Nachmittag, ${name}.`
  if (hour >= 18 && hour < 23) return `Guten Abend, ${name}.`
  return `Willkommen zurück, ${name}.`
}

export function getDailyInspiration(date: Date) {
  const startOfYear = Date.UTC(date.getFullYear(), 0, 0)
  const calendarDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const dayOfYear = Math.floor((calendarDay - startOfYear) / 86_400_000)
  return dailyInspirations[dayOfYear % dailyInspirations.length]
}
