import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DbPool } from './client.js'

const currentDir = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(pool: DbPool | null) {
  if (!pool) return
  const sql = await readFile(join(currentDir, 'schema.sql'), 'utf8')
  await pool.query(sql)
}
