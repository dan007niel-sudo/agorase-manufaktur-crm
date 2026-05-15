import type { PromptTemplate } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const columns = ['id', 'name', 'description', 'category', 'body'] as const

type Row = Record<string, unknown>

export function mapPromptTemplateRow(row: Row): PromptTemplate {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    category: text(row.category),
    body: text(row.body),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export function normalizePromptTemplateInput(input: Partial<PromptTemplate>): PromptTemplate {
  const now = new Date(0).toISOString()
  const value: PromptTemplate = {
    id: text(input.id),
    name: text(input.name),
    description: text(input.description),
    category: text(input.category),
    body: text(input.body),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now,
  }
  if (!value.id) {
    throw new HttpError('invalid_prompt_template', 'Prompt template id is required.', 400)
  }
  if (!value.name) {
    throw new HttpError('invalid_prompt_template', 'Prompt template name is required.', 400)
  }
  if (!value.body) {
    throw new HttpError('invalid_prompt_template', 'Prompt template body is required.', 400)
  }
  return value
}

export async function listPromptTemplates(pool: DbPool): Promise<PromptTemplate[]> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from prompt_templates order by name asc`,
  )
  return result.rows.map((row) => mapPromptTemplateRow(row as Row))
}

export async function upsertPromptTemplate(
  pool: DbPool,
  input: Partial<PromptTemplate>,
): Promise<PromptTemplate> {
  const template = normalizePromptTemplateInput(input)
  const values = [template.id, template.name, template.description, template.category, template.body]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into prompt_templates (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}, created_at, updated_at`,
    values,
  )
  return mapPromptTemplateRow(result.rows[0] as Row)
}

export async function getPromptTemplate(pool: DbPool, id: string): Promise<PromptTemplate | null> {
  const result = await pool.query(
    `select ${columns.join(', ')}, created_at, updated_at from prompt_templates where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapPromptTemplateRow(row as Row) : null
}

export async function deletePromptTemplate(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from prompt_templates where id = $1', [id])
}

export function createPostgresPromptTemplatesRepository(pool: DbPool) {
  return {
    list: () => listPromptTemplates(pool),
    get: (id: string) => getPromptTemplate(pool, id),
    upsert: (template: PromptTemplate) => upsertPromptTemplate(pool, template),
    delete: (id: string) => deletePromptTemplate(pool, id),
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function iso(value: unknown) {
  return value instanceof Date ? value.toISOString() : text(value)
}
