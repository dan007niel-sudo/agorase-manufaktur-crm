import { describe, expect, it } from 'vitest'
import type { PromptTemplate } from '@agorase/shared'
import {
  deletePromptTemplate,
  listPromptTemplates,
  mapPromptTemplateRow,
  normalizePromptTemplateInput,
  upsertPromptTemplate,
} from './promptTemplatesRepository.js'

const template: PromptTemplate = {
  id: 'tmpl-1',
  name: 'Capsule Brainstorm',
  description: 'Reusable capsule briefing prompt',
  category: 'capsule',
  body: 'Think in capsule terms.',
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
}

describe('promptTemplatesRepository', () => {
  it('maps rows to prompt templates', () => {
    expect(mapPromptTemplateRow(rowFromTemplate(template))).toMatchObject({
      id: 'tmpl-1',
      name: 'Capsule Brainstorm',
      body: 'Think in capsule terms.',
    })
  })

  it('rejects templates without a body', () => {
    expect(() => normalizePromptTemplateInput({ ...template, body: '' })).toThrow(
      'Prompt template body is required.',
    )
  })

  it('lists templates ordered by name', async () => {
    const pool = fakePool([{ rows: [rowFromTemplate(template)] }])

    await expect(listPromptTemplates(pool)).resolves.toHaveLength(1)

    expect(pool.calls[0]?.sql).toContain('order by name asc')
  })

  it('upserts and deletes templates', async () => {
    const pool = fakePool([{ rows: [rowFromTemplate(template)] }, { rows: [] }])

    await upsertPromptTemplate(pool, template)
    await deletePromptTemplate(pool, template.id)

    expect(pool.calls[0]?.sql).toContain('on conflict (id) do update')
    expect(pool.calls[1]).toMatchObject({ values: [template.id] })
  })
})

type Row = Record<string, unknown>

function fakePool(results: Array<{ rows: Row[] }>) {
  const calls: Array<{ sql: string; values?: unknown[] }> = []
  return {
    calls,
    async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values })
      return results.shift() ?? { rows: [] }
    },
    async end() {
      return undefined
    },
  }
}

function rowFromTemplate(value: PromptTemplate): Row {
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    category: value.category,
    body: value.body,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  }
}
