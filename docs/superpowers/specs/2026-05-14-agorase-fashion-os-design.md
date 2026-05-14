# Agorase Fashion OS Design Spec

**Status:** Approved for planning on 2026-05-14

**Product Goal:** Turn the local `agorase-manufaktur-crm` React/Vite app into a deployable Agorase Fashion OS for a clothing-only brand that sources European production partners and supports sourcing, creative brainstorming, visualization, mockups, legal orientation, release planning, and web operations.

**Core Decision:** Agorase Fashion OS is one product and one repository with two technical runtimes: a Render Static Site for the React UI and a secure backend API service for Gemini and future image generation calls.

---

## Current State

The existing project is a local Vite/React application named `agorase-manufaktur-crm`. It currently stores data in browser localStorage and focuses on a CRM-style fashion partner pipeline. The main domain object is `Manufactory`, supported by categories, pipeline statuses, metrics, follow-up tasks, templates, bulk import, and an AI research module.

The current AI path is not production-ready for the target architecture. It uses an OpenAI-oriented frontend flow with a Vite development proxy and an API key stored in local state. The Fashion OS target requires server-side key handling and a provider architecture centered on Google Gemini.

The current project was not a Git repository before this spec. Git must be initialized before worktree-based implementation begins.

---

## Target Architecture

The repository should become a small monorepo:

```text
agorase-manufaktur-crm/
  apps/
    web/
      React/Vite Fashion OS interface deployed as a Render Static Site
    api/
      Secure API service deployed as a Render Web Service
  packages/
    shared/
      Shared TypeScript types, provider contracts, prompt inputs, and workflow schemas
  docs/
    superpowers/
      Design specs and implementation plans
  render.yaml
    Optional Render Blueprint for the static site and API service
```

The existing UI code should migrate into `apps/web` instead of being rewritten from scratch. The backend should be introduced as a minimal TypeScript service that owns all calls requiring secrets.

The frontend must never read, store, or transmit a user-entered production Gemini API key directly to Google. Browser code calls internal API routes only. The API service reads `GEMINI_API_KEY` or `GOOGLE_API_KEY` from server environment variables.

---

## Runtime Responsibilities

### Web Runtime

The web runtime owns the Fashion OS user experience:

- Command Center dashboard
- Sourcing and production partner pipeline
- Partner detail records
- Creative Lab for brainstorming and visual direction
- Mockup workspace shell
- Legal orientation workspace
- Release planner
- Web operations workspace
- Settings and provider status display

The web runtime can keep local-first storage for Phase 1, but its data access should be wrapped so a later persistent backend or database can be introduced without rewriting every component.

### API Runtime

The API runtime owns secure provider calls and policy boundaries:

- Gemini text/research requests
- Structured sourcing suggestions
- Prompt and response validation
- Future image generation requests through a provider adapter
- Provider configuration and health checks
- Rate limiting hooks
- Error normalization
- Secret access through environment variables only

The API runtime should expose product-level endpoints such as `/api/research/partners`, `/api/brainstorm`, `/api/visualize`, and `/api/mockups/generate` rather than leaking provider-specific details into the UI.

---

## AI Provider Strategy

The first production provider is Google Gemini. The API should define provider contracts in `packages/shared` and implement Gemini behind those contracts in `apps/api`.

Text and research flows should support structured JSON outputs where possible. The existing AI research schema can be adapted into a provider-neutral partner suggestion schema.

Image generation must be planned as a separate provider adapter. The desired future target is high-resolution fashion-grade generation aligned with the quality bar of Project Tyrannus Media. The current likely Google path is Nano Banana Pro, officially Gemini 3 Pro Image, or the best current Gemini image model available when implementation begins. The concrete model ID must live in API configuration, not in UI components.

Generated images should later support:

- fashion product concepts
- garment mood directions
- lookbook-style visuals
- mockups for drops and releases
- web/editorial visual assets
- 4K or highest practical resolution output where supported

Phase 1 should prepare contracts and UI entry points but does not need to produce final production image generation unless the implementation plan explicitly includes that task.

---

## Product Information Architecture

The CRM navigation should evolve into Fashion OS navigation:

- **Command Center:** priority overview, upcoming production decisions, open releases, AI tasks, and partner follow-ups.
- **Sourcing:** European partner discovery, filters, research imports, and scoring.
- **Partners:** detailed supplier, atelier, factory, material, and service provider records.
- **Production:** capabilities, MOQ, lead times, sampling status, compliance notes, and collaboration stage.
- **Creative Lab:** brainstorming briefs, visual prompts, capsule ideas, references, and direction boards.
- **Mockups:** future workspace for generated assets, garment mockups, and campaign visuals.
- **Legal Orientation:** non-lawyer guidance notes, risk checklists, contracts-to-review, imprint/privacy/web compliance tasks, and disclaimer copy.
- **Releases:** drop calendar, collection state, asset readiness, web copy, launch checklist, and post-launch notes.
- **Web Ops:** website tasks, landing page copy, SEO notes, content publishing checklist, and deployment readiness.
- **Settings:** provider status, environment expectations, data reset/export, and technical diagnostics.

Legal Orientation must be framed as orientation and workflow support, not legal advice.

---

## Domain Model Direction

The existing `Manufactory` type should be replaced or wrapped by a broader partner model:

- `Partner`: identity, location, contact, links, category, status, score, source, notes
- `ProductionCapability`: product categories, materials, MOQ, lead time, sample support, certifications, regions served
- `PartnerInteraction`: outreach, response, next step, follow-up, documents requested
- `CreativeBrief`: capsule idea, target silhouette, references, audience, constraints, AI prompt inputs
- `GeneratedAsset`: prompt, provider, model, status, preview URL or local metadata, usage intent
- `LegalNote`: topic, jurisdiction, risk level, status, source links, next action
- `Release`: name, season/drop, products, partner dependencies, content tasks, launch date, status
- `WebTask`: page, task type, owner/status, copy/assets, release association

The implementation should preserve the value of existing seed data by migrating or adapting it instead of deleting it.

---

## Deployment Plan

Render deployment should use:

- Render Static Site for `apps/web`
- Render Web Service for `apps/api`
- Environment variables on the API service for Gemini credentials
- SPA rewrite from `/*` to `/index.html` for the web runtime
- Frontend environment variable such as `VITE_API_BASE_URL` pointing to the API service URL
- Optional `render.yaml` blueprint once the folder layout is stable

The static site build command should run the web build from the monorepo. The API service should have its own build/start commands. CI-style verification should run typecheck, lint, tests, and production build before deploy guidance is considered complete.

---

## Git And Worktree Plan

After this spec is committed, implementation should start from a clean baseline commit. Worktree usage should follow this order:

1. Ensure `.worktrees/` is ignored.
2. Commit the initial baseline.
3. Create focused worktrees from `main`.
4. Assign role-specific work to isolated branches.

Recommended worktrees:

- `.worktrees/fashion-os-monorepo` for folder migration and workspace scripts
- `.worktrees/fashion-os-api` for secure Gemini API service
- `.worktrees/fashion-os-ui` for Fashion OS information architecture and UI migration
- `.worktrees/fashion-os-deploy` for Render configuration and deployment docs
- `.worktrees/fashion-os-review` only if a separate integration review branch is useful

The requested 3-agent workflow should map to:

- `coder`: implementation in focused worktrees
- `reviewer`: spec compliance, code quality, tests, and security review
- `deployer`: Render readiness, environment docs, build commands, and deploy verification

The typo `delopyer` from the initial request is treated as `deployer`.

---

## Phase 1 Scope

Phase 1 should produce a deployable foundation, not the entire final operating system.

Included:

- Git baseline and safe worktree setup
- Monorepo structure
- Web app migration into `apps/web`
- API service creation in `apps/api`
- Shared types/contracts in `packages/shared`
- Gemini-safe API path for partner research or brainstorming
- Removal of frontend API key storage for production flows
- Fashion OS navigation and module shells
- Partner data model migration path
- Render Static Site plus API deployment documentation/configuration
- Tests for utility functions, provider contracts, API validation, and critical UI behavior

Excluded from Phase 1 unless explicitly added later:

- User authentication
- Multi-user database persistence
- Payments
- Final 4K production image generation
- Full legal document generation
- Real production order management
- Live website publishing automation

---

## Security Requirements

- No production API keys in frontend source, localStorage, committed files, or Vite public env variables.
- `.env` and `.env.*` must remain ignored, with `.env.example` allowed.
- API service must validate request bodies before provider calls.
- API responses must avoid returning raw provider errors if they include sensitive request metadata.
- Provider model IDs and keys must be configured server-side.
- Frontend settings may show provider readiness but not reveal secret values.

---

## Testing Requirements

Implementation tasks should use test-driven changes where practical.

Required verification categories:

- Unit tests for domain migration and scoring logic
- Unit tests for AI prompt/request builders
- API tests for validation and error handling
- UI tests for navigation and critical user flows where practical
- Production build verification for web and API
- Lint/typecheck across the monorepo

Baseline commands should be captured in the implementation plan after the monorepo package manager structure is chosen.

---

## Open Implementation Choices

These choices should be resolved in the implementation plan:

- Whether to keep npm workspaces or switch to another package manager.
- Whether the API service uses Express, Hono, Fastify, or Render-compatible plain Node.
- Whether local data stays in localStorage wrappers or moves to a lightweight local repository abstraction in Phase 1.
- Which exact Gemini text model and image model IDs are current at implementation time.
- Whether `render.yaml` is added immediately or after manual Render settings are proven.

The recommended defaults are npm workspaces, a small Express or Hono TypeScript API, localStorage wrapped behind a repository interface, server-configured Gemini model IDs, and a `render.yaml` once build commands pass locally.

---

## Approval

This spec reflects the approved direction from the user:

- One Agorase Fashion OS product
- Monorepo with `apps/web`, `apps/api`, and `packages/shared`
- Secure Gemini API integration planned directly from Phase 1
- Future high-quality image generation provider abstraction
- Render Static Site deployment for the frontend with a separate secure API runtime
- Git/worktree setup before multi-agent implementation
