import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DbPool } from './client.js'

const currentDir = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(pool: DbPool | null) {
  if (!pool) return
  const sql = await readSchemaSql()
  await pool.query(sql)
}

async function readSchemaSql() {
  try {
    return await readFile(join(currentDir, 'schema.sql'), 'utf8')
  } catch {
    return readFile(join(currentDir, '../../src/db/schema.sql'), 'utf8')
  }
}
