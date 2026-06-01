// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockupJob } from '@agorase/shared'

const listMockupJobsMock = vi.fn(async (): Promise<MockupJob[]> => [])

vi.mock('../../api/mockupsApi', () => ({
  listMockupJobs: (...args: unknown[]) => listMockupJobsMock(...(args as [])),
  deleteMockupJob: vi.fn(async () => undefined),
  downloadMockupJob: vi.fn(async () => undefined),
  generateMockup: vi.fn(),
}))

import { MockupsView } from './MockupsView'

function makePngFile(name: string): File {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  return new File([bytes], name, { type: 'image/png' })
}

async function uploadThreeReferences(input: HTMLInputElement) {
  for (const name of ['alpha.png', 'beta.png', 'gamma.png']) {
    fireEvent.change(input, { target: { files: [makePngFile(name)] } })
    await waitFor(() => {
      const matches = Array.from(
        document.querySelectorAll<HTMLElement>('.mockup-reference-name'),
      ).filter((el) => el.textContent === name)
      expect(matches.length).toBe(1)
    })
  }
}

function getReferenceNames(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.mockup-reference-name'),
  ).map((el) => el.textContent ?? '')
}

function getOrderButtons(index: number): { up: HTMLButtonElement; down: HTMLButtonElement } {
  const orderRows = document.querySelectorAll<HTMLElement>('.mockup-reference-order')
  const row = orderRows[index]
  const buttons = row.querySelectorAll<HTMLButtonElement>('button')
  return { up: buttons[0], down: buttons[1] }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  vi.clearAllMocks()
})

function makeJob(overrides: Partial<MockupJob> = {}): MockupJob {
  return {
    id: 'job-1',
    prompt: 'A simple prompt',
    referenceNotes: '',
    aspectRatio: '1:1',
    quality: 'standard',
    status: 'completed',
    modelUsed: 'gemini',
    imageUrl: '',
    imageData: '',
    mimeType: 'image/png',
    error: '',
    releaseId: '',
    briefId: '',
    notes: '',
    referenceImages: [],
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('MockupsView layout collapse on empty history', () => {
  it('renders only the workspace column when no jobs exist', async () => {
    listMockupJobsMock.mockResolvedValueOnce([])
    render(<MockupsView />)

    await waitFor(() => {
      expect(document.querySelector('.creative-lab-workspace')).not.toBeNull()
    })

    expect(document.querySelector('.creative-lab-list')).toBeNull()
    expect(document.querySelector('.creative-lab-directions')).toBeNull()
    expect(document.querySelector('.creative-lab-layout.mockups-layout--solo')).not.toBeNull()
  })

  it('renders the three-column layout when at least one job exists', async () => {
    listMockupJobsMock.mockResolvedValueOnce([makeJob()])
    render(<MockupsView />)

    await waitFor(() => {
      expect(document.querySelector('.creative-lab-list')).not.toBeNull()
    })

    expect(document.querySelector('.creative-lab-workspace')).not.toBeNull()
    expect(document.querySelector('.creative-lab-directions')).not.toBeNull()
    expect(document.querySelector('.creative-lab-layout.mockups-layout--solo')).toBeNull()
  })
})

describe('MockupsView reference reordering', () => {
  it('disables up on the first item and down on the last item', async () => {
    const { container } = render(<MockupsView />)
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Referenzbild hinzufügen"]',
    )!
    await uploadThreeReferences(input)

    expect(getReferenceNames()).toEqual(['alpha.png', 'beta.png', 'gamma.png'])
    const first = getOrderButtons(0)
    const middle = getOrderButtons(1)
    const last = getOrderButtons(2)
    expect(first.up.disabled).toBe(true)
    expect(first.down.disabled).toBe(false)
    expect(middle.up.disabled).toBe(false)
    expect(middle.down.disabled).toBe(false)
    expect(last.up.disabled).toBe(false)
    expect(last.down.disabled).toBe(true)
  })

  it('moves a reference down when its down button is clicked', async () => {
    const { container } = render(<MockupsView />)
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Referenzbild hinzufügen"]',
    )!
    await uploadThreeReferences(input)

    fireEvent.click(getOrderButtons(0).down)

    await waitFor(() => {
      expect(getReferenceNames()).toEqual(['beta.png', 'alpha.png', 'gamma.png'])
    })
  })

  it('moves a reference up when its up button is clicked', async () => {
    const { container } = render(<MockupsView />)
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Referenzbild hinzufügen"]',
    )!
    await uploadThreeReferences(input)

    fireEvent.click(getOrderButtons(2).up)

    await waitFor(() => {
      expect(getReferenceNames()).toEqual(['alpha.png', 'gamma.png', 'beta.png'])
    })
  })
})
