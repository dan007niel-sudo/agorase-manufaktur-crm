import pg from 'pg'
import type { ApiEnv } from '../env.js'
import { HttpError } from '../http.js'

export type DbPool = Pick<pg.Pool, 'query' | 'end'>

export function createDbPool(env: ApiEnv): pg.Pool | null {
  if (!env.databaseUrl) return null
  return new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  })
}

export function requireDbPool(pool: DbPool | null): DbPool {
  if (!pool) throw new HttpError('database_unavailable', 'Database is not configured.', 503)
  return pool
}
