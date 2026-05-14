# Agorase Fashion OS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing local `agorase-manufaktur-crm` Vite app into the deployable Agorase Fashion OS foundation with a monorepo layout, secure Gemini API backend, Fashion OS navigation, and Render-ready deployment.

**Architecture:** Keep Agorase Fashion OS as one product and one repository with two technical runtimes: `apps/web` for the React/Vite frontend and `apps/api` for secure server-side provider calls. Shared TypeScript contracts live in `packages/shared` so the UI and API agree on partner research, provider health, and future image-generation request shapes.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Vitest, ESLint, npm workspaces, Node.js API service, Render Static Site, Render Web Service, Google Gemini API via server-side environment variables.

---

## File Structure

Create or modify these files during Phase 1:

- Modify: `package.json` to become the npm workspace root.
- Modify: `package-lock.json` after workspace dependency changes.
- Move: `index.html` to `apps/web/index.html`.
- Move: `src/` to `apps/web/src/`.
- Move: `public/` to `apps/web/public/`.
- Move: `vite.config.ts` to `apps/web/vite.config.ts`.
- Move: `tsconfig.app.json` to `apps/web/tsconfig.app.json`.
- Move: `tsconfig.node.json` to `apps/web/tsconfig.node.json`.
- Move: `eslint.config.js` to `eslint.config.js` at root, updated for workspace paths if needed.
- Create: `apps/web/package.json`.
- Create: `apps/web/tsconfig.json`.
- Create: `apps/api/package.json`.
- Create: `apps/api/tsconfig.json`.
- Create: `apps/api/src/index.ts`.
- Create: `apps/api/src/env.ts`.
- Create: `apps/api/src/http.ts`.
- Create: `apps/api/src/providers/gemini.ts`.
- Create: `apps/api/src/routes/health.ts`.
- Create: `apps/api/src/routes/research.ts`.
- Create: `apps/api/src/routes/visualize.ts`.
- Create: `apps/api/src/routes/mockups.ts`.
- Create: `apps/api/src/server.test.ts`.
- Create: `packages/shared/package.json`.
- Create: `packages/shared/tsconfig.json`.
- Create: `packages/shared/src/index.ts`.
- Create: `packages/shared/src/fashion.ts`.
- Create: `packages/shared/src/ai.ts`.
- Create: `packages/shared/src/api.ts`.
- Create: `packages/shared/src/fashion.test.ts`.
- Modify: `apps/web/src/aiResearch.ts` to call the internal API instead of provider APIs directly.
- Modify: `apps/web/src/App.tsx` to rename the UI shell into Fashion OS navigation and remove frontend API-key storage.
- Create: `apps/web/src/fashionOs.ts`.
- Create: `apps/web/src/fashionOs.test.ts`.
- Create: `render.yaml`.
- Create: `.env.example`.
- Modify: `README.md` to document local development and Render deployment.

---

## Task 0: Git And Worktree Setup

**Files:**
- Modify: `.gitignore`
- Verify: `docs/superpowers/specs/2026-05-14-agorase-fashion-os-design.md`

- [ ] **Step 1: Verify repository baseline**

Run:

```bash
git status --short
git log --oneline -1
npm test
npm run build
npm run lint
```

Expected:

```text
git status --short has no output
latest commit is chore: initialize agorase fashion os baseline
2 test files pass
production build succeeds
lint exits 0
```

- [ ] **Step 2: Verify worktree ignore rule**

Run:

```bash
git check-ignore -q .worktrees && echo ".worktrees ignored"
```

Expected:

```text
.worktrees ignored
```

- [ ] **Step 3: Create implementation worktrees**

Run from repository root:

```bash
mkdir -p .worktrees
git worktree add .worktrees/fashion-os-monorepo -b feature/fashion-os-monorepo
git worktree add .worktrees/fashion-os-api -b feature/fashion-os-api
git worktree add .worktrees/fashion-os-ui -b feature/fashion-os-ui
git worktree add .worktrees/fashion-os-deploy -b feature/fashion-os-deploy
```

Expected:

```text
Preparing worktree (new branch 'feature/fashion-os-monorepo')
Preparing worktree (new branch 'feature/fashion-os-api')
Preparing worktree (new branch 'feature/fashion-os-ui')
Preparing worktree (new branch 'feature/fashion-os-deploy')
```

- [ ] **Step 4: Record worktree layout**

Run:

```bash
git worktree list
```

Expected: output includes the main repo and the four `.worktrees/fashion-os-*` paths.

---

## Task 1: Monorepo Migration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Move: `index.html`, `src/`, `public/`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`

- [ ] **Step 1: Move the existing Vite app into `apps/web`**

Run:

```bash
mkdir -p apps/web
git mv index.html apps/web/index.html
git mv src apps/web/src
git mv public apps/web/public
git mv vite.config.ts apps/web/vite.config.ts
git mv tsconfig.app.json apps/web/tsconfig.app.json
git mv tsconfig.node.json apps/web/tsconfig.node.json
```

Expected: files are moved with Git history preserved.

- [ ] **Step 2: Replace root `package.json` with workspace scripts**

Set root `package.json` to:

```json
{
  "name": "agorase-fashion-os",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "npm run dev -w @agorase/web",
    "dev:web": "npm run dev -w @agorase/web",
    "dev:api": "npm run dev -w @agorase/api",
    "build": "npm run build -w @agorase/shared && npm run build -w @agorase/web",
    "build:web": "npm run build -w @agorase/web",
    "build:api": "npm run build -w @agorase/api",
    "lint": "eslint .",
    "test": "vitest run",
    "typecheck": "npm run typecheck -w @agorase/shared && npm run typecheck -w @agorase/web",
    "preview": "npm run preview -w @agorase/web"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.3.0",
    "globals": "^17.6.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vitest": "^4.1.6"
  }
}
```

- [ ] **Step 3: Create `apps/web/package.json`**

Create `apps/web/package.json`:

```json
{
  "name": "@agorase/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b"
  },
  "dependencies": {
    "@agorase/shared": "0.1.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "jsdom": "^29.1.1",
    "vite": "^8.0.12"
  }
}
```

- [ ] **Step 4: Create `apps/web/tsconfig.json`**

Create `apps/web/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 5: Update `apps/web/vite.config.ts`**

Replace the dev OpenAI proxy with an API target configured by env:

```ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8787'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  }
})
```

- [ ] **Step 6: Install workspace dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is updated for npm workspaces.

- [ ] **Step 7: Verify migrated web app**

Run:

```bash
npm test
npm run build:web
npm run lint
```

Expected: tests pass, web build succeeds, lint exits 0.

- [ ] **Step 8: Commit monorepo migration**

Run:

```bash
git add .
git commit -m "chore: migrate web app into monorepo"
```

---

## Task 2: Shared Fashion OS Contracts

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/fashion.ts`
- Create: `packages/shared/src/ai.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/fashion.test.ts`

- [ ] **Step 1: Create shared package metadata**

Create `packages/shared/package.json`:

```json
{
  "name": "@agorase/shared",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Define Fashion OS domain contracts**

Create `packages/shared/src/fashion.ts`:

```ts
export const fashionOsSections = [
  'Command Center',
  'Sourcing',
  'Partners',
  'Production',
  'Creative Lab',
  'Mockups',
  'Legal Orientation',
  'Releases',
  'Web Ops',
  'Settings'
] as const

export type FashionOsSection = (typeof fashionOsSections)[number]

export const partnerCategories = [
  'Factory',
  'Atelier',
  'Material Supplier',
  'Print & Finishing',
  'Pattern & Prototyping',
  'Label',
  'Packaging',
  'Logistics',
  'Showroom',
  'Agency'
] as const

export type PartnerCategory = (typeof partnerCategories)[number]

export const partnerStatuses = [
  'To Research',
  'Researched',
  'Contact Found',
  'Contacted',
  'Responded',
  'Call Planned',
  'Samples Requested',
  'In Review',
  'Approved Partner',
  'Rejected',
  'Revisit Later'
] as const

export type PartnerStatus = (typeof partnerStatuses)[number]

export type RiskLevel = 'low' | 'medium' | 'high'
export type ProviderStatus = 'ready' | 'missing_config' | 'error'

export interface Partner {
  id: string
  name: string
  category: PartnerCategory
  status: PartnerStatus
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  contactPerson: string
  source: string
  notes: string
  score: number
  nextStep: string
  nextFollowUp: string
}

export interface ProductionCapability {
  partnerId: string
  products: string[]
  materials: string[]
  moq: string
  leadTime: string
  sampleSupport: boolean
  certifications: string[]
}

export interface LegalNote {
  id: string
  topic: string
  jurisdiction: string
  riskLevel: RiskLevel
  status: 'open' | 'reviewing' | 'resolved'
  nextAction: string
  sources: string[]
}

export interface Release {
  id: string
  name: string
  season: string
  launchDate: string
  status: 'idea' | 'planning' | 'production' | 'content' | 'ready' | 'launched'
}
```

- [ ] **Step 3: Define AI contracts**

Create `packages/shared/src/ai.ts`:

```ts
import type { PartnerCategory } from './fashion'

export interface SourceLink {
  title: string
  url: string
}

export interface PartnerResearchRequest {
  categories: PartnerCategory[]
  regions: string
  productFocus: string
  priceLevel: 'Budget' | 'Mittel' | 'Premium' | 'Luxus' | 'Alle'
  count: number
}

export interface PartnerResearchSuggestion {
  name: string
  category: PartnerCategory
  city: string
  region: string
  country: string
  website: string
  email: string
  phone: string
  social: string
  contactPerson: string
  products: string
  score: number
  source: string
  nextStep: string
  notes: string
  confidence: number
  rationale: string
  sources: SourceLink[]
}

export interface PartnerResearchResponse {
  suggestions: PartnerResearchSuggestion[]
}

export interface BrainstormRequest {
  brief: string
  audience: string
  constraints: string
}

export interface BrainstormResponse {
  directions: Array<{
    title: string
    concept: string
    productIdeas: string[]
    visualLanguage: string
    risks: string[]
  }>
}

export interface ImageGenerationRequest {
  prompt: string
  aspectRatio: '1:1' | '4:5' | '3:4' | '16:9'
  quality: 'draft' | 'high' | 'ultra'
  referenceAssetIds: string[]
}

export interface ImageGenerationResponse {
  status: 'queued' | 'completed' | 'failed'
  assetId?: string
  message: string
}
```

- [ ] **Step 4: Define API envelope contracts**

Create `packages/shared/src/api.ts`:

```ts
import type { ProviderStatus } from './fashion'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface HealthResponse {
  ok: boolean
  providers: {
    gemini: ProviderStatus
    image: ProviderStatus
  }
}

export function clampCount(value: number, min = 1, max = 20) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}
```

- [ ] **Step 5: Export shared contracts**

Create `packages/shared/src/index.ts`:

```ts
export * from './api'
export * from './ai'
export * from './fashion'
```

- [ ] **Step 6: Add shared contract test**

Create `packages/shared/src/fashion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clampCount, fashionOsSections, partnerCategories, partnerStatuses } from './index'

describe('Fashion OS shared contracts', () => {
  it('defines the main operating system sections', () => {
    expect(fashionOsSections).toContain('Creative Lab')
    expect(fashionOsSections).toContain('Legal Orientation')
    expect(fashionOsSections).toContain('Web Ops')
  })

  it('keeps partner categories and statuses explicit', () => {
    expect(partnerCategories).toContain('Factory')
    expect(partnerStatuses).toContain('Samples Requested')
  })

  it('clamps AI request counts', () => {
    expect(clampCount(0)).toBe(1)
    expect(clampCount(8)).toBe(8)
    expect(clampCount(99)).toBe(20)
  })
})
```

- [ ] **Step 7: Run shared verification**

Run:

```bash
npm test
npm run build -w @agorase/shared
npm run typecheck -w @agorase/shared
```

Expected: tests pass and shared package emits `dist`.

- [ ] **Step 8: Commit shared contracts**

Run:

```bash
git add .
git commit -m "feat: add fashion os shared contracts"
```

---

## Task 3: Secure API Runtime

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/http.ts`
- Create: `apps/api/src/providers/gemini.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/research.ts`
- Create: `apps/api/src/routes/visualize.ts`
- Create: `apps/api/src/routes/mockups.ts`
- Create: `apps/api/src/server.test.ts`

- [ ] **Step 1: Create API package metadata**

Create `apps/api/package.json`:

```json
{
  "name": "@agorase/api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@agorase/shared": "0.1.0"
  },
  "devDependencies": {
    "tsx": "^4.20.6"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 1b: Add API to root verification scripts**

After `apps/api/package.json` exists, update the root `package.json` scripts:

```json
{
  "scripts": {
    "build": "npm run build -w @agorase/shared && npm run build -w @agorase/api && npm run build -w @agorase/web",
    "typecheck": "npm run typecheck -w @agorase/shared && npm run typecheck -w @agorase/api && npm run typecheck -w @agorase/web"
  }
}
```

- [ ] **Step 2: Create API env loader**

Create `apps/api/src/env.ts`:

```ts
export interface ApiEnv {
  port: number
  geminiApiKey: string
  geminiTextModel: string
  geminiImageModel: string
  allowedOrigins: string[]
}

export function readEnv(source = process.env): ApiEnv {
  return {
    port: Number(source.PORT || 8787),
    geminiApiKey: source.GEMINI_API_KEY || source.GOOGLE_API_KEY || '',
    geminiTextModel: source.GEMINI_TEXT_MODEL || 'gemini-2.5-pro',
    geminiImageModel: source.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview',
    allowedOrigins: (source.ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }
}
```

- [ ] **Step 3: Create HTTP helpers**

Create `apps/api/src/http.ts`:

```ts
import type { ApiErrorBody } from '@agorase/shared'

export function resolveOrigin(request: Request, allowedOrigins: string[]) {
  const origin = request.headers.get('origin')
  if (!origin) return allowedOrigins[0] || 'http://localhost:5173'
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || 'http://localhost:5173'
}

export function jsonResponse(body: unknown, status = 200, origin = 'http://localhost:5173') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  })
}

export function errorResponse(code: string, message: string, status = 400, origin = 'http://localhost:5173') {
  const body: ApiErrorBody = { error: { code, message } }
  return jsonResponse(body, status, origin)
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 100_000) throw new Error('Request body is too large')
  return (await request.json()) as T
}
```

- [ ] **Step 4: Create Gemini provider adapter**

Create `apps/api/src/providers/gemini.ts`:

```ts
import type { PartnerResearchRequest, PartnerResearchResponse } from '@agorase/shared'
import { clampCount } from '@agorase/shared'
import type { ApiEnv } from '../env'

export function hasGeminiConfig(env: ApiEnv) {
  return Boolean(env.geminiApiKey)
}

export function buildPartnerResearchPrompt(request: PartnerResearchRequest) {
  const categories = request.categories.length ? request.categories.join(', ') : 'European fashion production partners'
  return [
    `Find ${clampCount(request.count)} real European clothing production partners for Agorase Fashion OS.`,
    `Categories: ${categories}.`,
    `Regions: ${request.regions || 'Europe with DACH focus'}.`,
    `Product focus: ${request.productFocus || 'premium clothing, capsule collections, sampling, small-batch production'}.`,
    `Price level: ${request.priceLevel}.`,
    'Return structured partner suggestions with sources. Do not invent contact data.'
  ].join('\n')
}

export async function researchPartnersWithGemini(
  env: ApiEnv,
  request: PartnerResearchRequest
): Promise<PartnerResearchResponse> {
  if (!hasGeminiConfig(env)) {
    throw new Error('Gemini API key is not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiTextModel}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPartnerResearchPrompt(request) }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error('Gemini provider request failed')
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || '{"suggestions":[]}'
  return JSON.parse(text) as PartnerResearchResponse
}
```

- [ ] **Step 5: Create health route**

Create `apps/api/src/routes/health.ts`:

```ts
import type { HealthResponse } from '@agorase/shared'
import type { ApiEnv } from '../env'
import { jsonResponse, resolveOrigin } from '../http'
import { hasGeminiConfig } from '../providers/gemini'

export function healthRoute(request: Request, env: ApiEnv) {
  const body: HealthResponse = {
    ok: true,
    providers: {
      gemini: hasGeminiConfig(env) ? 'ready' : 'missing_config',
      image: hasGeminiConfig(env) ? 'ready' : 'missing_config'
    }
  }

  return jsonResponse(body, 200, resolveOrigin(request, env.allowedOrigins))
}
```

- [ ] **Step 6: Create research route**

Create `apps/api/src/routes/research.ts`:

```ts
import type { PartnerResearchRequest } from '@agorase/shared'
import { clampCount, partnerCategories } from '@agorase/shared'
import type { ApiEnv } from '../env'
import { errorResponse, jsonResponse, readJson, resolveOrigin } from '../http'
import { researchPartnersWithGemini } from '../providers/gemini'

export async function researchRoute(request: Request, env: ApiEnv) {
  const origin = resolveOrigin(request, env.allowedOrigins)
  try {
    const body = await readJson<PartnerResearchRequest>(request)
    const normalized: PartnerResearchRequest = {
      categories: Array.isArray(body.categories)
        ? body.categories.filter((category) => partnerCategories.includes(category))
        : [],
      regions: body.regions || '',
      productFocus: body.productFocus || '',
      priceLevel: body.priceLevel || 'Alle',
      count: clampCount(body.count)
    }
    const result = await researchPartnersWithGemini(env, normalized)
    return jsonResponse(result, 200, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Partner research failed'
    const status = message.includes('not configured') ? 503 : 400
    const safeMessage = status === 503 ? message : 'Partner research failed'
    return errorResponse('research_failed', safeMessage, status, origin)
  }
}
```

- [ ] **Step 7: Create placeholder-safe visualize and mockup routes**

Create `apps/api/src/routes/visualize.ts`:

```ts
import type { ApiEnv } from '../env'
import { jsonResponse, resolveOrigin } from '../http'

export async function visualizeRoute(request: Request, env: ApiEnv) {
  return jsonResponse(
    {
      directions: [],
      message: 'Creative visualization is wired through the secure API boundary and awaits provider implementation.'
    },
    200,
    resolveOrigin(request, env.allowedOrigins)
  )
}
```

Create `apps/api/src/routes/mockups.ts`:

```ts
import type { ImageGenerationResponse } from '@agorase/shared'
import type { ApiEnv } from '../env'
import { jsonResponse, resolveOrigin } from '../http'

export async function mockupsRoute(_request: Request, env: ApiEnv) {
  const body: ImageGenerationResponse = {
    status: 'queued',
    message: `Image generation is configured for server-side provider routing via ${env.geminiImageModel}.`
  }

  return jsonResponse(body, 202, resolveOrigin(_request, env.allowedOrigins))
}
```

- [ ] **Step 8: Create API server entrypoint**

Create `apps/api/src/index.ts`:

```ts
import { readEnv } from './env'
import { errorResponse, jsonResponse, resolveOrigin } from './http'
import { healthRoute } from './routes/health'
import { mockupsRoute } from './routes/mockups'
import { researchRoute } from './routes/research'
import { visualizeRoute } from './routes/visualize'

export async function handleRequest(request: Request, env = readEnv()) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') return jsonResponse({}, 204, resolveOrigin(request, env.allowedOrigins))
  if (url.pathname === '/api/health' && request.method === 'GET') return healthRoute(request, env)
  if (url.pathname === '/api/research/partners' && request.method === 'POST') return researchRoute(request, env)
  if (url.pathname === '/api/visualize' && request.method === 'POST') return visualizeRoute(request, env)
  if (url.pathname === '/api/mockups/generate' && request.method === 'POST') return mockupsRoute(request, env)

  return errorResponse('not_found', 'Route not found', 404, resolveOrigin(request, env.allowedOrigins))
}

const env = readEnv()

if (process.env.NODE_ENV !== 'test') {
  const server = await import('node:http')
  server
    .createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      incoming.on('end', async () => {
        const request = new Request(`http://localhost${incoming.url || '/'}`, {
          method: incoming.method,
          headers: incoming.headers as HeadersInit,
          body: chunks.length ? Buffer.concat(chunks) : undefined
        })
        const response = await handleRequest(request, env)
        outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        outgoing.end(await response.text())
      })
    })
    .listen(env.port, () => {
      console.log(`Agorase API listening on ${env.port}`)
    })
}
```

- [ ] **Step 9: Add API tests**

Create `apps/api/src/server.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readEnv } from './env'
import { handleRequest } from './index'
import { buildPartnerResearchPrompt, hasGeminiConfig } from './providers/gemini'

describe('API server', () => {
  it('reports missing Gemini config without exposing secrets', async () => {
    const response = await handleRequest(new Request('http://localhost/api/health'), readEnv({}))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.providers.gemini).toBe('missing_config')
  })

  it('rejects research calls when Gemini is not configured', async () => {
    const response = await handleRequest(
      new Request('http://localhost/api/research/partners', {
        method: 'POST',
        body: JSON.stringify({ count: 3, categories: [], regions: '', productFocus: '', priceLevel: 'Alle' })
      }),
      readEnv({})
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'research_failed' }
    })
  })

  it('builds a product-specific Gemini research prompt', () => {
    expect(hasGeminiConfig(readEnv({ GEMINI_API_KEY: 'test-key' }))).toBe(true)
    expect(
      buildPartnerResearchPrompt({
        categories: ['Factory'],
        regions: 'Portugal, Italy',
        productFocus: 'premium cut-and-sew',
        priceLevel: 'Premium',
        count: 4
      })
    ).toContain('Agorase Fashion OS')
  })
})
```

- [ ] **Step 10: Install and verify API**

Run:

```bash
npm install
npm test
npm run build:api
npm run lint
```

Expected: tests pass, API builds, lint exits 0.

- [ ] **Step 11: Commit API runtime**

Run:

```bash
git add .
git commit -m "feat: add secure fashion os api runtime"
```

---

## Task 4: Web Integration And Fashion OS Navigation

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/aiResearch.ts`
- Modify: `apps/web/src/types.ts`
- Create: `apps/web/src/fashionOs.ts`
- Create: `apps/web/src/fashionOs.test.ts`

- [ ] **Step 1: Add Fashion OS section metadata**

Create `apps/web/src/fashionOs.ts`:

```ts
import type { FashionOsSection } from '@agorase/shared'

export interface FashionOsModule {
  section: FashionOsSection
  label: string
  shortLabel: string
  summary: string
  status: 'active' | 'foundation' | 'planned'
}

export const fashionOsModules: FashionOsModule[] = [
  {
    section: 'Command Center',
    label: 'Command Center',
    shortLabel: 'Command',
    summary: 'Priority view for sourcing, production, creative, release, and web work.',
    status: 'active'
  },
  {
    section: 'Sourcing',
    label: 'Sourcing',
    shortLabel: 'Sourcing',
    summary: 'European production partner discovery, scoring, and research imports.',
    status: 'active'
  },
  {
    section: 'Partners',
    label: 'Partners',
    shortLabel: 'Partners',
    summary: 'Supplier, atelier, factory, material, and service partner records.',
    status: 'active'
  },
  {
    section: 'Production',
    label: 'Production',
    shortLabel: 'Production',
    summary: 'Capabilities, MOQ, lead time, samples, and collaboration readiness.',
    status: 'foundation'
  },
  {
    section: 'Creative Lab',
    label: 'Creative Lab',
    shortLabel: 'Creative',
    summary: 'Brainstorming briefs, visual direction, capsule concepts, and prompts.',
    status: 'foundation'
  },
  {
    section: 'Mockups',
    label: 'Mockups',
    shortLabel: 'Mockups',
    summary: 'Server-routed image generation workspace for garment and campaign visuals.',
    status: 'planned'
  },
  {
    section: 'Legal Orientation',
    label: 'Legal Orientation',
    shortLabel: 'Legal',
    summary: 'Risk checklists and review workflows for non-lawyer orientation.',
    status: 'foundation'
  },
  {
    section: 'Releases',
    label: 'Releases',
    shortLabel: 'Releases',
    summary: 'Drop planning, collection state, content readiness, and launch tasks.',
    status: 'foundation'
  },
  {
    section: 'Web Ops',
    label: 'Web Ops',
    shortLabel: 'Web Ops',
    summary: 'Website copy, SEO notes, publishing tasks, and deployment readiness.',
    status: 'foundation'
  },
  {
    section: 'Settings',
    label: 'Settings',
    shortLabel: 'Settings',
    summary: 'Provider status, environment expectations, data export, and diagnostics.',
    status: 'foundation'
  }
]
```

- [ ] **Step 2: Test module metadata**

Create `apps/web/src/fashionOs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fashionOsModules } from './fashionOs'

describe('fashionOsModules', () => {
  it('contains the operating system areas Agorase needs', () => {
    expect(fashionOsModules.map((module) => module.section)).toEqual([
      'Command Center',
      'Sourcing',
      'Partners',
      'Production',
      'Creative Lab',
      'Mockups',
      'Legal Orientation',
      'Releases',
      'Web Ops',
      'Settings'
    ])
  })

  it('marks visible foundation modules without pretending everything is complete', () => {
    expect(fashionOsModules.find((module) => module.section === 'Mockups')?.status).toBe('planned')
    expect(fashionOsModules.find((module) => module.section === 'Sourcing')?.status).toBe('active')
  })
})
```

- [ ] **Step 3: Replace frontend AI provider call**

Modify `apps/web/src/aiResearch.ts` so `requestAiManufactories` calls the internal API:

```ts
export async function requestAiManufactories({
  criteria
}: {
  apiKey?: string
  criteria: AiResearchCriteria
  model?: string
}) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${apiBaseUrl}/api/research/partners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      categories: criteria.categories,
      regions: criteria.regions,
      productFocus: criteria.productFocus,
      priceLevel: criteria.priceLevel,
      count: criteria.count
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Research request failed with status ${response.status}`)
  }

  return parseAiResearchResponse(await response.json())
}
```

Also update `parseAiResearchResponse` to accept both the old test shape and the new `{ suggestions: [...] }` API shape.

- [ ] **Step 4: Remove frontend API key storage**

Modify `apps/web/src/App.tsx`:

- Remove `apiKey: 'agorase.openaiApiKey'` from `storageKeys`.
- Remove UI state or inputs that ask for a provider key.
- Change visible naming from `Fashion CRM` to `Fashion OS`.
- Rename sections to the Fashion OS module labels while reusing existing views where sensible:
  - `Command Center` renders the current dashboard.
  - `Sourcing` renders AI research and bulk import entry points.
  - `Partners` renders the current list/detail view.
  - `Production` renders pipeline and capability foundation.
  - `Creative Lab`, `Mockups`, `Legal Orientation`, `Releases`, `Web Ops`, and `Settings` render lightweight workspace panels using `fashionOsModules` summaries.

- [ ] **Step 5: Add foundation workspace panel**

In `apps/web/src/App.tsx`, add a reusable panel:

```tsx
function WorkspaceFoundation({ module }: { module: FashionOsModule }) {
  return (
    <section className="panel">
      <PanelHeader title={module.label} />
      <div className="foundation-panel">
        <span className="label">{module.status}</span>
        <p>{module.summary}</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Verify web integration**

Run:

```bash
npm test
npm run build:web
npm run lint
```

Expected: tests pass, web build succeeds, lint exits 0.

- [ ] **Step 7: Commit web integration**

Run:

```bash
git add .
git commit -m "feat: reshape web app into fashion os shell"
```

---

## Task 5: Render Deployment Foundation

**Files:**
- Create: `render.yaml`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add `.env.example`**

Create `.env.example`:

```bash
# API service only. Never expose this in Vite client env.
GEMINI_API_KEY=
GOOGLE_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-pro
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
ALLOWED_ORIGINS=http://localhost:5173
PORT=8787

# Web development proxy target.
VITE_API_PROXY_TARGET=http://localhost:8787

# Web production API origin. This is not a secret.
VITE_API_BASE_URL=http://localhost:8787
```

- [ ] **Step 2: Add Render Blueprint**

Create `render.yaml`:

```yaml
services:
  - type: web
    name: agorase-fashion-os-api
    runtime: node
    plan: starter
    buildCommand: npm install && npm run build:api
    startCommand: npm run start -w @agorase/api
    envVars:
      - key: NODE_VERSION
        value: 24
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_TEXT_MODEL
        value: gemini-2.5-pro
      - key: GEMINI_IMAGE_MODEL
        value: gemini-3-pro-image-preview
      - key: ALLOWED_ORIGINS
        sync: false

  - type: web
    name: agorase-fashion-os-web
    runtime: static
    buildCommand: npm install && npm run build:web
    staticPublishPath: apps/web/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: NODE_VERSION
        value: 24
      - key: VITE_API_BASE_URL
        sync: false
```

- [ ] **Step 3: Update README**

Add these sections to `README.md`:

```md
## Agorase Fashion OS

Agorase Fashion OS is a clothing-brand operating system for European production sourcing, partner workflows, creative planning, mockups, legal orientation, releases, and web operations.

## Local Development

```bash
npm install
npm run dev:api
npm run dev:web
```

The web app runs through Vite. The API service owns all Gemini and future image-generation provider calls.

## Environment

Copy `.env.example` to local environment files as needed. Do not commit real secrets.

`GEMINI_API_KEY` or `GOOGLE_API_KEY` belongs on the API service only. Do not create `VITE_*` variables for provider secrets.

## Render

Deploy the frontend as a Render Static Site from `apps/web/dist`. Deploy the backend as a Render Web Service. Set Gemini secrets only on the API service. Configure the web app with `VITE_API_BASE_URL` pointing to the deployed API URL. `VITE_API_PROXY_TARGET` is for local Vite development only.
```

- [ ] **Step 4: Verify deployment commands locally**

Run:

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit deployment foundation**

Run:

```bash
git add .
git commit -m "chore: add render deployment foundation"
```

---

## Task 6: Integration Review And Mainline Merge

**Files:**
- Review all changed files.

- [ ] **Step 1: Merge worktrees in dependency order**

From main repository root:

```bash
git checkout main
git merge --no-ff feature/fashion-os-monorepo
git merge --no-ff feature/fashion-os-api
git merge --no-ff feature/fashion-os-ui
git merge --no-ff feature/fashion-os-deploy
```

Expected: merges complete. Resolve conflicts by preserving the final monorepo layout and shared contracts.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm install
npm test
npm run typecheck
npm run build
npm run lint
git status --short
```

Expected:

```text
all tests pass
typecheck passes
web and api builds pass
lint exits 0
git status --short has no output
```

- [ ] **Step 3: Run security scan by text search**

Run:

```bash
rg "openaiApiKey|Authorization: `Bearer|VITE_.*KEY|localStorage.*apiKey|GEMINI_API_KEY" apps packages README.md render.yaml .env.example
```

Expected:

- No frontend localStorage API-key storage remains.
- `GEMINI_API_KEY` appears only in `.env.example`, README docs, API env handling, or Render config.
- Gemini provider calls do not put API keys in URLs or query strings.
- API errors returned to the frontend do not include raw provider responses.
- No real key values appear.

- [ ] **Step 4: Final commit if merge produced changes**

Run:

```bash
git status --short
```

If merge conflict resolutions or integration fixes changed files:

```bash
git add .
git commit -m "chore: integrate fashion os foundation"
```

- [ ] **Step 5: Leave worktrees available or clean up on request**

Run:

```bash
git worktree list
```

Report the active worktrees. Do not remove them unless the user asks for cleanup.

---

## Agent Assignment

Use the requested 3-agent workflow:

- `coder`: Tasks 1, 2, 3, and 4 in focused implementation worktrees.
- `reviewer`: After each coder task, check spec compliance, security, test coverage, and code quality.
- `deployer`: Task 5 and deployment-readiness review, then support Task 6 verification.

Recommended execution:

1. Controller creates all worktrees.
2. `coder` handles `feature/fashion-os-monorepo`.
3. `coder` or a second implementation pass handles `feature/fashion-os-api`.
4. `coder` handles `feature/fashion-os-ui` after shared contracts exist.
5. `deployer` handles `feature/fashion-os-deploy`.
6. `reviewer` checks each branch before merge.
7. Controller performs final integration and verification on `main`.

---

## Self-Review Notes

Spec coverage:

- Git initialization and worktree setup are covered in Task 0.
- Monorepo structure is covered in Task 1.
- Secure Gemini backend is covered in Task 3.
- Shared provider/domain contracts are covered in Task 2.
- Fashion OS navigation and module shell are covered in Task 4.
- Render Static Site plus API deployment is covered in Task 5.
- Multi-agent workflow and integration review are covered in Task 6.

No intentional placeholders are left in Phase 1 tasks. Image generation is explicitly routed through a safe API boundary but not fully implemented in Phase 1, matching the approved design.
