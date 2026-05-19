// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecordForm } from './FormControls'
import type { Manufactory } from '../types'

const baseRecord: Manufactory = {
  id: '',
  name: '',
  contactPerson: '',
  category: 'Streetwear',
  city: '',
  region: '',
  country: 'Deutschland',
  website: '',
  email: '',
  phone: '',
  social: '',
  products: '',
  priceLevel: 'Premium',
  brandFit: 'A',
  cooperationPotential: 'Hoch',
  status: 'Kontakt gefunden',
  priority: 'A',
  source: '',
  lastContact: '',
  nextFollowUp: '',
  nextStep: '',
  notes: '',
}

describe('RecordForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('closes when Escape is pressed', () => {
    const onCancel = vi.fn()
    render(<RecordForm initialRecord={baseRecord} onCancel={onCancel} onSave={vi.fn()} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('closes from the backdrop without closing when the form itself is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(<RecordForm initialRecord={baseRecord} onCancel={onCancel} onSave={vi.fn()} />)
    const form = container.querySelector('.record-form') as HTMLElement
    const backdrop = container.querySelector('.modal-backdrop') as HTMLElement

    fireEvent.click(form)
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
