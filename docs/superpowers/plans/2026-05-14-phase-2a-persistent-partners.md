# Phase 2A Persistent Partners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Agorase partner/manufactory CRM records in Render Postgres and sync them through the API instead of browser-only `localStorage`.

**Architecture:** Add shared CRM contracts, a Postgres-backed API repository, partner CRUD/import routes, and a small frontend API client. The API owns migrations and database credentials; the static web app only calls `/api/partners` routes through `VITE_API_BASE_URL`.

**Tech Stack:** TypeScript, React/Vite, Node `fetch` API, `pg`, Render Blueprint Postgres, Vitest.

---

## File Structure

- Modify `render.yaml`: add Render Postgres and attach `DATABASE_URL` to the API service with `fromDatabase`.
- Modify `.env.example`: document local `DATABASE_URL`.
- Modify `packages/shared/src/index.ts`: export CRM contracts.
- Create `packages/shared/src/crm.ts`: canonical `Manufactory`, enum arrays, and response/request types.
- Modify `apps/web/src/types.ts`: re-export CRM contracts from `@agorase/shared`.
- Create `apps/api/src/db/schema.sql`: idempotent `partners` table migration.
- Create `apps/api/src/db/client.ts`: `pg` pool creation and graceful database-unavailable errors.
- Create `apps/api/src/db/migrate.ts`: startup migration runner.
- Create `apps/api/src/db/partnersRepository.ts`: row mapping, validation, CRUD, and bulk upsert.
- Create `apps/api/src/routes/partners.ts`: HTTP route handling for partner CRUD/import.
- Modify `apps/api/src/env.ts`: include `databaseUrl`.
- Modify `apps/api/src/index.ts`: initialize DB on startup and route `/api/partners`.
- Modify `apps/api/package.json`: add `pg` runtime dependency and `@types/pg` dev dependency.
- Create `apps/api/src/db/partnersRepository.test.ts`: validation and mapping tests.
- Modify `apps/api/src/server.test.ts`: route tests with mocked repository.
- Create `apps/web/src/partnersApi.ts`: frontend partner API client.
- Create `apps/web/src/partnersApi.test.ts`: client success/error tests.
- Modify `apps/web/src/App.tsx`: load/save/import records through API, add Settings seed-save action, preserve task `localStorage`.
- Modify `apps/web/src/App.css`: add the `.app-alert` status style.
- Modify `README.md` and `docs/deployment/render-readiness.md`: document Postgres setup and live verification.

## Task 1: Shared CRM Contract

**Files:**
- Create: `packages/shared/src/crm.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/types.ts`
- Test: existing `apps/web/src/crmUtils.test.ts`, existing shared build

- [ ] **Step 1: Create shared CRM types**

Create `packages/shared/src/crm.ts` with the current web CRM vocabulary:

```ts
export const categories = [
  'Ready-to-Wear',
  'Streetwear',
  'Outerwear',
  'Denim',
  'Knitwear',
  'Tailoring',
  'Lederwaren',
  'Schuhe',
  'Taschen',
  'Schmuck',
  'Eyewear',
  'Textilien & Stoffe',
  'Print & Veredelung',
  'Schnitt & Prototyping',
  'Sustainable Fashion',
] as const

export const pipelineStatuses = [
  'Zu recherchieren',
  'Recherchiert',
  'Kontakt gefunden',
  'Erstkontakt gesendet',
  'Antwort erhalten',
  'Gespräch geplant',
  'Line Sheet / Samples angefragt',
  'Kooperation in Prüfung',
  'Aufgenommen',
  'Abgelehnt',
  'Später erneut kontaktieren',
] as const

export type Category = (typeof categories)[number]
export type PipelineStatus = (typeof pipelineStatuses)[number]
export type PriceLevel = 'Budget' | 'Mittel' | 'Premium' | 'Luxus'
export type FitScore = 'A' | 'A-' | 'B+' | 'B' | 'C'
export type Potential = 'Hoch' | 'Mittel' | 'Niedrig'
export type Priority = 'A' | 'A-' | 'B' | 'C'

export interface Manufactory {
  id: string
  name: string
  contactPerson: string
  category: Category
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  products: string
  priceLevel: PriceLevel
  brandFit: FitScore
  cooperationPotential: Potential
  status: PipelineStatus
  priority: Priority
  source: string
  lastContact: string
  nextFollowUp: string
  nextStep: string
  notes: string
}

export interface CrmTask {
  id: string
  manufactureId: string
  title: string
  dueDate: string
  urgency: 'overdue' | 'today' | 'upcoming'
  completed: boolean
}

export interface Metrics {
  total: number
  highFit: number
  highPotential: number
  contacted: number
  dueFollowUps: number
  openTasks: number
}

export interface Template {
  id: string
  name: string
  subject: string
  body: string
}

export interface PartnersResponse {
  partners: Manufactory[]
}

export interface PartnerResponse {
  partner: Manufactory
}

export interface PartnerImportRequest {
  partners: Manufactory[]
}
```

- [ ] **Step 2: Export the contract**

Append this line to `packages/shared/src/index.ts`:

```ts
export * from './crm.js'
```

- [ ] **Step 3: Re-export from the web types module**

Replace `apps/web/src/types.ts` with:

```ts
export {
  categories,
  pipelineStatuses,
  type Category,
  type CrmTask,
  type FitScore,
  type Manufactory,
  type Metrics,
  type PipelineStatus,
  type Potential,
  type PriceLevel,
  type Priority,
  type Template,
} from '@agorase/shared'
```

- [ ] **Step 4: Verify the shared contract**

Run:

```bash
npm run build -w @agorase/shared
npm run typecheck -w @agorase/web
npx vitest run apps/web/src/crmUtils.test.ts
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/crm.ts packages/shared/src/index.ts apps/web/src/types.ts
git commit -m "feat: share crm partner contracts"
```

## Task 2: Render Postgres Configuration

**Files:**
- Modify: `render.yaml`
- Modify: `.env.example`
- Modify: `apps/api/src/env.ts`
- Test: `apps/api/src/server.test.ts`

- [ ] **Step 1: Extend API env**

Modify `apps/api/src/env.ts` so `ApiEnv` includes `databaseUrl`:

```ts
export interface ApiEnv {
  port: number
  geminiApiKey: string
  geminiTextModel: string
  geminiImageModel: string
  allowedOrigins: string[]
  databaseUrl: string
}
```

Add this property in `readEnv`:

```ts
databaseUrl: source.DATABASE_URL || '',
```

- [ ] **Step 2: Add a Render Postgres database**

Append this root-level block to `render.yaml` after `services`:

```yaml
databases:
  - name: agorase-fashion-os-db
    region: frankfurt
    plan: basic-256mb
    databaseName: agorase_fashion_os
    postgresMajorVersion: "18"
```

Add `DATABASE_URL` to the API service `envVars`:

```yaml
      - key: DATABASE_URL
        fromDatabase:
          name: agorase-fashion-os-db
          property: connectionString
```

- [ ] **Step 3: Document local database env**

Add this API-only value to `.env.example`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agorase_fashion_os
```

- [ ] **Step 4: Add env test coverage**

Add to `apps/api/src/server.test.ts`:

```ts
it('reads the database URL from server-only env', () => {
  expect(readEnv({ DATABASE_URL: 'postgresql://example/internal' }).databaseUrl).toBe('postgresql://example/internal')
})
```

- [ ] **Step 5: Verify config**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file("render.yaml"); puts "render.yaml parses"'
npx vitest run apps/api/src/server.test.ts
```

Expected: YAML parses and API tests pass.

- [ ] **Step 6: Commit**

```bash
git add render.yaml .env.example apps/api/src/env.ts apps/api/src/server.test.ts
git commit -m "chore: configure render postgres"
```

## Task 3: API Database Layer

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/db/schema.sql`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/partnersRepository.ts`
- Create: `apps/api/src/db/partnersRepository.test.ts`

- [ ] **Step 1: Install database dependencies**

Run:

```bash
npm install pg -w @agorase/api
npm install -D @types/pg -w @agorase/api
```

Expected: `apps/api/package.json` and root `package-lock.json` update.

- [ ] **Step 2: Write migration SQL**

Create `apps/api/src/db/schema.sql`:

```sql
create table if not exists partners (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  category text not null,
  city text not null default '',
  region text not null default '',
  country text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  social text not null default '',
  products text not null default '',
  price_level text not null,
  brand_fit text not null,
  cooperation_potential text not null,
  status text not null,
  priority text not null,
  source text not null default '',
  last_contact text not null default '',
  next_follow_up text not null default '',
  next_step text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_updated_at_idx on partners (updated_at desc);
```

- [ ] **Step 3: Create database client**

Create `apps/api/src/db/client.ts`:

```ts
import pg from 'pg'
import { HttpError } from '../http.js'
import type { ApiEnv } from '../env.js'

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
```

- [ ] **Step 4: Create migration runner**

Create `apps/api/src/db/migrate.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { DbPool } from './client.js'

const currentDir = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(pool: DbPool | null) {
  if (!pool) return
  const sql = await readFile(join(currentDir, 'schema.sql'), 'utf8')
  await pool.query(sql)
}
```

- [ ] **Step 5: Write failing repository tests**

Create `apps/api/src/db/partnersRepository.test.ts` with an in-memory fake pool:

```ts
import { describe, expect, it } from 'vitest'
import { mapPartnerRow, normalizePartnerInput } from './partnersRepository.js'

describe('partnersRepository', () => {
  it('maps database rows to Manufactory records', () => {
    expect(
      mapPartnerRow({
        id: 'atelier-forma',
        name: 'Atelier Forma',
        contact_person: 'Lena',
        category: 'Ready-to-Wear',
        city: 'Köln',
        region: 'NRW',
        country: 'Deutschland',
        website: 'https://forma.example',
        email: 'hello@forma.example',
        phone: '',
        social: '@atelierforma',
        products: 'Overshirts',
        price_level: 'Premium',
        brand_fit: 'A',
        cooperation_potential: 'Hoch',
        status: 'Recherchiert',
        priority: 'A',
        source: 'KI-Recherche',
        last_contact: '',
        next_follow_up: '',
        next_step: 'Line Sheet prüfen',
        notes: 'Stark',
      }),
    ).toMatchObject({
      id: 'atelier-forma',
      contactPerson: 'Lena',
      priceLevel: 'Premium',
      brandFit: 'A',
      nextStep: 'Line Sheet prüfen',
    })
  })

  it('rejects invalid enum values', () => {
    expect(() =>
      normalizePartnerInput({
        id: 'bad',
        name: 'Bad',
        category: 'Invalid',
        status: 'Recherchiert',
        priceLevel: 'Premium',
        brandFit: 'A',
        cooperationPotential: 'Hoch',
        priority: 'A',
      }),
    ).toThrow('Invalid partner category.')
  })
})
```

- [ ] **Step 6: Verify tests fail before implementation**

Run:

```bash
npx vitest run apps/api/src/db/partnersRepository.test.ts
```

Expected: fail because `partnersRepository.ts` does not exist.

- [ ] **Step 7: Implement repository**

Create `apps/api/src/db/partnersRepository.ts` with exported `mapPartnerRow`, `normalizePartnerInput`, and repository functions:

```ts
import type { Manufactory } from '@agorase/shared'
import { categories, pipelineStatuses } from '@agorase/shared'
import { HttpError } from '../http.js'
import type { DbPool } from './client.js'

const priceLevels = ['Budget', 'Mittel', 'Premium', 'Luxus'] as const
const fitScores = ['A', 'A-', 'B+', 'B', 'C'] as const
const potentials = ['Hoch', 'Mittel', 'Niedrig'] as const
const priorities = ['A', 'A-', 'B', 'C'] as const

type PartnerRow = Record<string, string>

export function mapPartnerRow(row: PartnerRow): Manufactory {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || '',
    category: row.category as Manufactory['category'],
    city: row.city || '',
    region: row.region || '',
    country: row.country || '',
    website: row.website || '',
    email: row.email || '',
    phone: row.phone || '',
    social: row.social || '',
    products: row.products || '',
    priceLevel: row.price_level as Manufactory['priceLevel'],
    brandFit: row.brand_fit as Manufactory['brandFit'],
    cooperationPotential: row.cooperation_potential as Manufactory['cooperationPotential'],
    status: row.status as Manufactory['status'],
    priority: row.priority as Manufactory['priority'],
    source: row.source || '',
    lastContact: row.last_contact || '',
    nextFollowUp: row.next_follow_up || '',
    nextStep: row.next_step || '',
    notes: row.notes || '',
  }
}

export function normalizePartnerInput(input: Partial<Manufactory>): Manufactory {
  const partner: Manufactory = {
    id: text(input.id),
    name: text(input.name),
    contactPerson: text(input.contactPerson),
    category: oneOf(input.category, categories, 'Invalid partner category.'),
    city: text(input.city),
    region: text(input.region),
    country: text(input.country),
    website: text(input.website),
    email: text(input.email),
    phone: text(input.phone),
    social: text(input.social),
    products: text(input.products),
    priceLevel: oneOf(input.priceLevel, priceLevels, 'Invalid partner price level.'),
    brandFit: oneOf(input.brandFit, fitScores, 'Invalid partner brand fit.'),
    cooperationPotential: oneOf(input.cooperationPotential, potentials, 'Invalid partner potential.'),
    status: oneOf(input.status, pipelineStatuses, 'Invalid partner status.'),
    priority: oneOf(input.priority, priorities, 'Invalid partner priority.'),
    source: text(input.source),
    lastContact: text(input.lastContact),
    nextFollowUp: text(input.nextFollowUp),
    nextStep: text(input.nextStep),
    notes: text(input.notes),
  }

  if (!partner.id) throw new HttpError('invalid_partner', 'Partner id is required.', 400)
  if (!partner.name) throw new HttpError('invalid_partner', 'Partner name is required.', 400)
  return partner
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
  if (typeof value === 'string' && allowed.includes(value as T)) return value as T
  throw new HttpError('invalid_partner', message, 400)
}
```

Then add repository SQL functions below the helpers:

```ts
const columns = [
  'id',
  'name',
  'contact_person',
  'category',
  'city',
  'region',
  'country',
  'website',
  'email',
  'phone',
  'social',
  'products',
  'price_level',
  'brand_fit',
  'cooperation_potential',
  'status',
  'priority',
  'source',
  'last_contact',
  'next_follow_up',
  'next_step',
  'notes',
]

export async function listPartners(pool: DbPool): Promise<Manufactory[]> {
  const result = await pool.query(`select ${columns.join(', ')} from partners order by updated_at desc, name asc`)
  return result.rows.map(mapPartnerRow)
}

export async function upsertPartner(pool: DbPool, input: Partial<Manufactory>): Promise<Manufactory> {
  const partner = normalizePartnerInput(input)
  const values = [
    partner.id,
    partner.name,
    partner.contactPerson,
    partner.category,
    partner.city,
    partner.region,
    partner.country,
    partner.website,
    partner.email,
    partner.phone,
    partner.social,
    partner.products,
    partner.priceLevel,
    partner.brandFit,
    partner.cooperationPotential,
    partner.status,
    partner.priority,
    partner.source,
    partner.lastContact,
    partner.nextFollowUp,
    partner.nextStep,
    partner.notes,
  ]
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ')
  const result = await pool.query(
    `insert into partners (${columns.join(', ')})
     values (${placeholders})
     on conflict (id) do update set ${updates}, updated_at = now()
     returning ${columns.join(', ')}`,
    values,
  )
  return mapPartnerRow(result.rows[0])
}

export async function updatePartner(pool: DbPool, id: string, patch: Partial<Manufactory>): Promise<Manufactory> {
  const current = await pool.query(`select ${columns.join(', ')} from partners where id = $1`, [id])
  if (!current.rows[0]) throw new HttpError('partner_not_found', 'Partner not found.', 404)
  return upsertPartner(pool, { ...mapPartnerRow(current.rows[0]), ...patch, id })
}

export async function deletePartner(pool: DbPool, id: string): Promise<void> {
  await pool.query('delete from partners where id = $1', [id])
}

export async function importPartners(pool: DbPool, partners: Partial<Manufactory>[]): Promise<Manufactory[]> {
  const saved: Manufactory[] = []
  for (const partner of partners) {
    saved.push(await upsertPartner(pool, partner))
  }
  return saved
}

export function createPostgresPartnersRepository(pool: DbPool) {
  return {
    list: () => listPartners(pool),
    upsert: (partner: Manufactory) => upsertPartner(pool, partner),
    update: (id: string, patch: Partial<Manufactory>) => updatePartner(pool, id, patch),
    delete: (id: string) => deletePartner(pool, id),
    importMany: (partners: Manufactory[]) => importPartners(pool, partners),
  }
}
```

- [ ] **Step 8: Verify repository**

Run:

```bash
npx vitest run apps/api/src/db/partnersRepository.test.ts
npm run typecheck -w @agorase/api
```

Expected: tests and typecheck pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/package.json package-lock.json apps/api/src/db
git commit -m "feat: add postgres partner repository"
```

## Task 4: Partner API Routes

**Files:**
- Create: `apps/api/src/routes/partners.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/server.test.ts`

- [ ] **Step 1: Write route tests first**

Add tests to `apps/api/src/server.test.ts` using a fake repository object injected through a request context:

```ts
it('lists partners from the repository', async () => {
  const response = await handleRequest(new Request('http://localhost/api/partners'), {
    env: readEnv({ DATABASE_URL: 'postgresql://example/internal' }),
    partnersRepository: {
      list: async () => [],
      upsert: async (partner) => partner,
      update: async (_id, partner) => partner,
      delete: async () => undefined,
      importMany: async (partners) => partners,
    },
  })

  await expect(response.json()).resolves.toEqual({ partners: [] })
})
```

- [ ] **Step 2: Verify route test fails**

Run:

```bash
npx vitest run apps/api/src/server.test.ts
```

Expected: fail because `handleRequest` does not accept the repository context yet.

- [ ] **Step 3: Create route module**

Create `apps/api/src/routes/partners.ts`:

```ts
import type { Manufactory } from '@agorase/shared'
import { errorResponse, jsonResponse, readJson, resolveOrigin, safeHttpError } from '../http.js'
import type { ApiEnv } from '../env.js'

export interface PartnersRepository {
  list(): Promise<Manufactory[]>
  upsert(partner: Manufactory): Promise<Manufactory>
  update(id: string, patch: Partial<Manufactory>): Promise<Manufactory>
  delete(id: string): Promise<void>
  importMany(partners: Manufactory[]): Promise<Manufactory[]>
}

export async function partnersRoute(request: Request, env: ApiEnv, repository: PartnersRepository) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  const url = new URL(request.url)
  const partnerId = decodeURIComponent(url.pathname.replace(/\/$/, '').replace('/api/partners/', ''))

  try {
    if (request.method === 'GET' && url.pathname.replace(/\/$/, '') === '/api/partners') {
      return jsonResponse({ partners: await repository.list() }, 200, origin)
    }

    if (request.method === 'POST' && url.pathname.replace(/\/$/, '') === '/api/partners/import') {
      const body = await readJson<{ partners?: Manufactory[] }>(request)
      return jsonResponse({ partners: await repository.importMany(body.partners ?? []) }, 200, origin)
    }

    if (request.method === 'POST' && url.pathname.replace(/\/$/, '') === '/api/partners') {
      const body = await readJson<Manufactory>(request)
      return jsonResponse({ partner: await repository.upsert(body) }, 200, origin)
    }

    if (request.method === 'PUT' && partnerId && !partnerId.includes('/')) {
      const body = await readJson<Partial<Manufactory>>(request)
      return jsonResponse({ partner: await repository.update(partnerId, body) }, 200, origin)
    }

    if (request.method === 'DELETE' && partnerId && !partnerId.includes('/')) {
      await repository.delete(partnerId)
      return jsonResponse({}, 204, origin)
    }

    return errorResponse('not_found', 'Route not found', 404, origin)
  } catch (error) {
    const safeError = safeHttpError(error, 'partners_failed', 'Partner request failed.', 500)
    return errorResponse(safeError.code, safeError.message, safeError.status, origin)
  }
}
```

- [ ] **Step 4: Wire context into `handleRequest`**

Modify `apps/api/src/index.ts` so `handleRequest` receives:

```ts
export interface ApiContext {
  env: ApiEnv
  partnersRepository?: PartnersRepository
}
```

Normalize the old test signature with:

```ts
function toContext(contextOrEnv: ApiEnv | ApiContext): ApiContext {
  return 'env' in contextOrEnv ? contextOrEnv : { env: contextOrEnv }
}
```

Route partner paths:

```ts
if (pathname === '/api/partners' || pathname.startsWith('/api/partners/')) {
  if (!context.partnersRepository) return errorResponse('database_unavailable', 'Database is not configured.', 503, origin)
  return partnersRoute(request, env, context.partnersRepository)
}
```

- [ ] **Step 5: Verify route tests**

Run:

```bash
npx vitest run apps/api/src/server.test.ts
npm run typecheck -w @agorase/api
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/routes/partners.ts apps/api/src/server.test.ts
git commit -m "feat: add partner api routes"
```

## Task 5: API Startup Migrations And Repository Wiring

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/server.test.ts`

- [ ] **Step 1: Wire database at server startup**

In `apps/api/src/index.ts`, create the pool and run migrations only outside tests:

```ts
const env = readEnv()

if (process.env.NODE_ENV !== 'test') {
  const pool = createDbPool(env)
  await runMigrations(pool)
  const partnersRepository = pool ? createPostgresPartnersRepository(pool) : undefined
  const context: ApiContext = { env, partnersRepository }
  // pass context to handleRequest in the HTTP server callback
}
```

- [ ] **Step 2: Add graceful shutdown**

Inside the server boot block:

```ts
process.on('SIGTERM', async () => {
  await pool?.end()
  process.exit(0)
})
```

- [ ] **Step 3: Verify startup path**

Run:

```bash
npm run build -w @agorase/api
PORT=8791 node apps/api/dist/index.js
```

In a second terminal, run:

```bash
curl -sS -i http://localhost:8791/api/partners
```

Expected without local `DATABASE_URL`: `503` normalized JSON error. Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/server.test.ts
git commit -m "feat: initialize partner database on api startup"
```

## Task 6: Frontend Partner API Client

**Files:**
- Create: `apps/web/src/partnersApi.ts`
- Create: `apps/web/src/partnersApi.test.ts`

- [ ] **Step 1: Write failing API client tests**

Create `apps/web/src/partnersApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { importPartners, listPartners, savePartner } from './partnersApi'
import { createEmptyManufacture } from './crmUtils'

afterEach(() => vi.restoreAllMocks())

describe('partnersApi', () => {
  it('loads partners from the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partners: [] }), { status: 200 }))
    await expect(listPartners()).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledWith('/api/partners', expect.any(Object))
  })

  it('saves one partner through the API', async () => {
    const partner = createEmptyManufacture('Atelier Forma')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partner }), { status: 200 }))
    await expect(savePartner(partner)).resolves.toMatchObject({ name: 'Atelier Forma' })
  })

  it('imports partners through the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ partners: [] }), { status: 200 }))
    await expect(importPartners([])).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Verify client tests fail**

Run:

```bash
npx vitest run apps/web/src/partnersApi.test.ts
```

Expected: fail because `partnersApi.ts` does not exist.

- [ ] **Step 3: Implement client**

Create `apps/web/src/partnersApi.ts`:

```ts
import type { Manufactory, PartnerResponse, PartnersResponse } from '@agorase/shared'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function listPartners() {
  const body = await requestJson<PartnersResponse>('/api/partners', { method: 'GET' })
  return body.partners
}

export async function savePartner(partner: Manufactory) {
  const body = await requestJson<PartnerResponse>('/api/partners', {
    method: 'POST',
    body: JSON.stringify(partner),
  })
  return body.partner
}

export async function updatePartner(id: string, patch: Partial<Manufactory>) {
  const body = await requestJson<PartnerResponse>(`/api/partners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
  return body.partner
}

export async function importPartners(partners: Manufactory[]) {
  const body = await requestJson<PartnersResponse>('/api/partners/import', {
    method: 'POST',
    body: JSON.stringify({ partners }),
  })
  return body.partners
}
```

- [ ] **Step 4: Verify client**

Run:

```bash
npx vitest run apps/web/src/partnersApi.test.ts
npm run typecheck -w @agorase/web
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/partnersApi.ts apps/web/src/partnersApi.test.ts
git commit -m "feat: add partner api client"
```

## Task 7: Frontend API Sync

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`
- Test: `apps/web/src/partnersApi.test.ts`, existing web tests

- [ ] **Step 1: Update app imports**

In `apps/web/src/App.tsx`, import `useEffect` and partner API helpers:

```ts
import { useEffect, useMemo, useState } from 'react'
import { importPartners, listPartners, savePartner, updatePartner } from './partnersApi'
```

- [ ] **Step 2: Replace record local state**

Replace:

```ts
const [records, setRecords] = useLocalState<Manufactory[]>(storageKeys.records, seedManufactories)
```

with:

```ts
const [records, setRecords] = useState<Manufactory[]>(seedManufactories)
const [recordsStatus, setRecordsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
const [recordsError, setRecordsError] = useState('')
```

- [ ] **Step 3: Load records on app mount**

Add inside `App`:

```ts
useEffect(() => {
  let active = true

  async function loadRecords() {
    try {
      const loaded = await listPartners()
      if (!active) return
      setRecords(loaded.length ? loaded : seedManufactories)
      setSelectedId((current) => current || loaded[0]?.id || seedManufactories[0]?.id || '')
      setRecordsStatus('ready')
    } catch (caught) {
      if (!active) return
      setRecords(seedManufactories)
      setRecordsError(caught instanceof Error ? caught.message : 'Partner konnten nicht geladen werden.')
      setRecordsStatus('error')
    }
  }

  void loadRecords()
  return () => {
    active = false
  }
}, [])
```

- [ ] **Step 4: Make save/update/import async**

Change `saveRecord`:

```ts
async function saveRecord(nextRecord: Manufactory) {
  const saved = await savePartner(nextRecord)
  setRecords((current) => upsertManufacture(current, saved))
  setSelectedId(saved.id)
  setFormOpen(false)
}
```

Change `updateSelectedRecord`:

```ts
async function updateSelectedRecord(patch: Partial<Manufactory>) {
  if (!selectedRecord) return
  const updated = await updatePartner(selectedRecord.id, patch)
  setRecords((current) => upsertManufacture(current, updated))
  setSelectedId(updated.id)
}
```

Change AI and bulk import callbacks:

```ts
const saved = await importPartners(newRecords)
setRecords((current) => saved.reduce((next, record) => upsertManufacture(next, record), current))
```

- [ ] **Step 5: Add seed save action for Settings**

Create a `SettingsView` component in `App.tsx`:

```tsx
function SettingsView({ onSeedSave, status }: { onSeedSave: () => void; status: string }) {
  return (
    <section className="panel">
      <PanelHeader title="Settings" />
      <div className="foundation-panel">
        <span className="label">Phase 2A</span>
        <p>{status}</p>
        <button type="button" className="primary-button" onClick={onSeedSave}>
          Seed speichern
        </button>
      </div>
    </section>
  )
}
```

Use it for the Settings section:

```tsx
{activeSection === 'Settings' && (
  <SettingsView
    status={recordsStatus === 'error' ? recordsError : 'Partnerdaten werden über die API synchronisiert.'}
    onSeedSave={async () => {
      const saved = await importPartners(seedManufactories)
      setRecords(saved)
      setSelectedId(saved[0]?.id ?? '')
      setRecordsStatus('ready')
      setRecordsError('')
    }}
  />
)}
```

- [ ] **Step 6: Show API status near topbar**

After `Topbar`, add:

```tsx
{recordsStatus === 'error' && <div className="app-alert">Partnerdaten konnten nicht synchronisiert werden.</div>}
```

Add to `apps/web/src/App.css`:

```css
.app-alert {
  border: 1px solid #d97706;
  background: #fff7ed;
  color: #7c2d12;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.9rem;
}
```

- [ ] **Step 7: Verify frontend sync**

Run:

```bash
npx vitest run apps/web/src/partnersApi.test.ts apps/web/src/crmUtils.test.ts apps/web/src/aiResearch.test.ts
npm run typecheck -w @agorase/web
npm run build -w @agorase/web
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.css
git commit -m "feat: sync partners through api"
```

## Task 8: Documentation And Deployment Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment/render-readiness.md`

- [ ] **Step 1: Document database setup**

Add to `README.md` Render Deployment section:

```md
Phase 2A also provisions Render Postgres through `render.yaml`. The API receives `DATABASE_URL` from the database's internal connection string via `fromDatabase`; the web service never receives database credentials.
```

- [ ] **Step 2: Update readiness checklist**

Add to `docs/deployment/render-readiness.md`:

```md
- Confirm Render created `agorase-fashion-os-db` in Frankfurt.
- Confirm API env has `DATABASE_URL` from `agorase-fashion-os-db` with `property: connectionString`.
- Confirm live `GET /api/partners` returns `{ "partners": [...] }` or an empty array.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run lint
rg 'DATABASE_URL|GEMINI_API_KEY|GOOGLE_API_KEY|x-goog-api-key|AIza' apps/web/dist || true
```

Expected: tests, typecheck, build, and lint pass. Web bundle secret scan has no output.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/deployment/render-readiness.md
git commit -m "docs: document persistent partner deployment"
```

## Task 9: Push And Live Smoke Test

**Files:**
- No code files; this task verifies the deployed system.

- [ ] **Step 1: Push `main`**

Run:

```bash
git push
```

Expected: GitHub receives all Phase 2A commits and Render starts Blueprint sync/deploy.

- [ ] **Step 2: Wait for Render deploy**

Poll:

```bash
curl -sS https://agorase-fashion-os-api.onrender.com/api/health
curl -sS https://agorase-fashion-os-api.onrender.com/api/partners
```

Expected health stays ready and partners returns JSON.

- [ ] **Step 3: Test partner import on live API**

Run:

```bash
curl -sS -X POST https://agorase-fashion-os-api.onrender.com/api/partners/import \
  -H 'Origin: https://agorase-fashion-os-web.onrender.com' \
  -H 'Content-Type: application/json' \
  --data '{"partners":[{"id":"phase-2-smoke","name":"Phase 2 Smoke Atelier","contactPerson":"","category":"Ready-to-Wear","city":"Berlin","region":"Berlin","country":"Deutschland","website":"","email":"","phone":"","social":"","products":"Smoke test","priceLevel":"Mittel","brandFit":"B","cooperationPotential":"Mittel","status":"Recherchiert","priority":"B","source":"Smoke","lastContact":"","nextFollowUp":"","nextStep":"Smoke prüfen","notes":"Created by deployment smoke test"}]}'
```

Expected: response contains `phase-2-smoke`.

- [ ] **Step 4: Confirm frontend loads**

Run:

```bash
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' https://agorase-fashion-os-web.onrender.com/
```

Expected: `200 text/html; charset=utf-8`.

- [ ] **Step 5: Report**

Summarize:

- Git commit range pushed
- Render API URL
- Render web URL
- database created
- live `GET /api/partners` result shape
- remaining Phase 2B scope: login and workspaces
