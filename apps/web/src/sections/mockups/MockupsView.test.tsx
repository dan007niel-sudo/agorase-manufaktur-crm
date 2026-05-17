// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/mockupsApi', () => ({
  listMockupJobs: vi.fn(async () => []),
  deleteMockupJob: vi.fn(async () => undefined),
  downloadMockupJob: vi.fn(async () => undefined),
  generateMockup: vi.fn(),
}))
vi.mock('../../api/creativeApi', () => ({
  listCreativeBriefs: vi.fn(async () => []),
}))
vi.mock('../../api/releasesApi', () => ({
  listReleases: vi.fn(async () => []),
}))

import { fashionOsModules } from '../../fashionOs'
import { MockupsView } from './MockupsView'

const mockupsModule = fashionOsModules.find((m) => m.section === 'Mockups')!

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

describe('MockupsView reference reordering', () => {
  it('disables up on the first item and down on the last item', async () => {
    const { container } = render(<MockupsView module={mockupsModule} />)
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
    const { container } = render(<MockupsView module={mockupsModule} />)
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
    const { container } = render(<MockupsView module={mockupsModule} />)
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
