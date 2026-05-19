// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandCenter } from './CommandCenter'
import type { Manufactory } from '../../types'

const metrics = {
  total: 1,
  contacted: 1,
  highFit: 1,
  highPotential: 1,
  dueFollowUps: 0,
  openTasks: 0,
}

const record: Manufactory = {
  id: 'atelier-nordwear',
  name: 'Atelier Nordwear',
  contactPerson: '',
  category: 'Streetwear',
  city: 'Hamburg',
  region: 'Hamburg',
  country: 'Deutschland',
  website: '',
  email: '',
  phone: '',
  social: '',
  products: '',
  priceLevel: 'Premium',
  brandFit: 'A',
  cooperationPotential: 'Hoch',
  status: 'Antwort erhalten',
  priority: 'A',
  source: '',
  lastContact: '',
  nextFollowUp: '',
  nextStep: '',
  notes: '',
}

describe('CommandCenter', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows a personal greeting and daily SCH2000 work impulse for Max', () => {
    render(
      <CommandCenter
        metrics={metrics}
        records={[record]}
        tasks={[]}
        now={new Date(2026, 4, 19, 8)}
        onSelectRecord={vi.fn()}
        onSectionChange={vi.fn()}
        onToggleTask={vi.fn()}
      />,
    )

    expect(screen.getByText('Guten Morgen, Max.')).toBeTruthy()
    expect(screen.getByText('Impuls des Tages')).toBeTruthy()
    expect(screen.getByText('SCH2000')).toBeTruthy()
    expect(screen.getByText(/Heute:/)).toBeTruthy()
  })
})
