import { describe, expect, it } from 'vitest'
import { getDailyInspiration, getTimeGreeting } from './dailyInspiration'

describe('dailyInspiration', () => {
  it('greets Max according to the local time of day', () => {
    expect(getTimeGreeting(new Date(2026, 4, 19, 8), 'Max')).toBe('Guten Morgen, Max.')
    expect(getTimeGreeting(new Date(2026, 4, 19, 12), 'Max')).toBe('Guten Mittag, Max.')
    expect(getTimeGreeting(new Date(2026, 4, 19, 16), 'Max')).toBe('Guten Nachmittag, Max.')
    expect(getTimeGreeting(new Date(2026, 4, 19, 20), 'Max')).toBe('Guten Abend, Max.')
    expect(getTimeGreeting(new Date(2026, 4, 19, 2), 'Max')).toBe('Willkommen zurück, Max.')
  })

  it('selects the same inspiration for the same calendar day', () => {
    const morning = getDailyInspiration(new Date(2026, 4, 19, 8))
    const evening = getDailyInspiration(new Date(2026, 4, 19, 20))

    expect(morning.reference).toBe(evening.reference)
    expect(morning.translation).toBe('SCH2000')
  })

  it('moves through the curated rotation on different days', () => {
    const firstDay = getDailyInspiration(new Date(2026, 4, 19))
    const nextDay = getDailyInspiration(new Date(2026, 4, 20))

    expect(firstDay.reference).not.toBe(nextDay.reference)
    expect(firstDay.action.length).toBeGreaterThan(0)
    expect(nextDay.reflection.length).toBeGreaterThan(0)
  })
})
