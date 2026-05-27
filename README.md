<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<h1 style="font-size: 4.25rem; font-weight: 800; line-height: 1; margin: 0;">NEAR Builders</h1>

<img src="ui/src/assets/under-construction.gif" alt="NEAR Builders" width="380" />

</div>

The open platform for builders on NEAR — discover builders, showcase projects, and explore on-chain apps. Built on [everything.dev](https://everything.dev) as a tenant runtime, composed via [Module Federation](https://module-federation.io/) and [every-plugin](https://plugin.everything.dev/), running on [NEAR Protocol](https://near.dev/).

NEAR Builders extends the `everything.dev` host at `bos://dev.everything.near/everything.dev`. The shared host, API shell, and auth system are inherited. This repository provides the UI, three domain plugins, and the runtime configuration that define the nearbuilders.org experience. Changing `bos.config.json` changes what loads — no rebuild needed for URL updates.

## Quick Start

```bash
bunx everything-dev@latest init
```

Or for this repository specifically:

```bash
git clone https://github.com/nearbuilders/everything-dev.git
cd nearbuilders.org
cp .env.example .env   # Add your secrets
docker compose up -d --wait   # Start PostgreSQL (4 databases)
bun install
bun run dev              # Starts UI + API locally, host is remote
```

Visit http://localhost:3003 (UI), http://localhost:3001 (API).

## Tenant Runtime

This repository is a **tenant runtime** that extends the parent `everything.dev` platform:

```
bos://dev.everything.near/everything.dev    ← parent platform (host, auth, API shell)
  └── bos://work.efiz.near/nearbuilders.org ← this tenant (UI, plugins, branding)
```

**What nearbuilders.org provides:**

- **Builder profiles** — A curated directory of NEAR builders with moderation, skills, and social links
- **Projects & ideas** — A ranked project board with upvoting, markdown editing, and GitHub integration
- **App discovery** — A FastKV-based registry for browsing, inspecting, and publishing on-chain runtime apps
- **Custom UI** — Branding, navigation, and pages tailored for the builder community

**What nearbuilders.org inherits from everything.dev:**

- Host server (Hono.js, Module Federation, SSR)
- Auth system (Better-Auth, NEAR SIWN, organizations, API keys)
- API shell (oRPC contracts, Effect services, plugin composition)
- CLI tooling (`bos` / `everything-dev`)
- Shared dependencies (React, TanStack Router, TanStack Query, Drizzle)

## Why

Three problems keep NEAR builders from finding each other and getting their work seen:

1. **Discovery is fragmented** — builders, projects, and on-chain apps live in different places with no unified directory.
2. **Showcasing requires custom infra** — every team rebuilds profiles, project pages, and app catalogs from scratch.
3. **On-chain work is invisible** — published runtimes and builder accomplishments are hard to browse or verify.

NEAR Builders solves all three in a single runtime-composed application. Builder profiles are curated with admin review. Projects and ideas get upvote ranking and markdown editing. Published apps are discoverable through a FastKV registry with on-chain metadata. And because it runs on the everything.dev tenant model, none of this requires rebuilding the platform.

**Discover builders. Ship projects. Browse apps. All on NEAR.**

## CLI Commands

`everything-dev` is the runtime package and CLI. `bos` is a command alias. See [AGENTS.md](./AGENTS.md) for the quick reference and [LLM.txt](./LLM.txt) for the full technical guide.

### Development

```bash
bos dev --host remote   # Remote host, local UI + API (typical for tenant development)
bos dev --ui remote     # Isolate API work
bos dev --api remote    # Isolate UI work
bos dev                 # Full local, client shell by default
bos dev --ssr           # Opt into local SSR
```

### Production

```bash
bos start --no-interactive   # All remotes, production URLs
```

### Build & Publish

```bash
bos build               # Build all packages (updates bos.config.json)
bos publish             # Publish config to the FastKV registry
bos publish --deploy    # Build/deploy all workspaces, then publish
bos sync                # Sync from parent runtime (everything.dev)
```

### Project Management

```bash
bos info                # Show configuration
bos status              # Check remote health
bos clean               # Clean build artifacts
```

## Development Workflow

### Making Changes

- **UI Changes**: Edit `ui/src/` → hot reload automatically → publish with `bos publish --deploy`
- **Plugin Changes**: Edit `plugins/*/src/` → hot reload automatically → publish per plugin
- **Config Changes**: Edit `bos.config.json` → publish with `bos publish --deploy`
- **Host/Auth Changes**: These live in the parent `everything.dev` repository — submit PRs upstream

### Before Committing

Always run these commands before committing:

```bash
bun test        # Run all tests
bun typecheck   # Type check all packages
bun lint        # Run linting
```

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning:

**When to add a changeset:**
- Any user-facing change (features, fixes, deprecations)
- Breaking changes
- Skip for: docs-only changes, internal refactors, test-only changes

**Create a changeset:**
```bash
bun run changeset
# Follow prompts to select packages and describe changes
```

The release workflow (`.github/workflows/release.yml`) handles versioning and GitHub releases automatically on merge to main.

### Git Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines including branch naming, semantic commits, and PR process.

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Quick operational guide for AI agents
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Contribution guidelines and git workflow
- **[LLM.txt](./LLM.txt)** — Deep technical reference for implementation
- **[API README](./api/README.md)** — API plugin documentation
- **[UI README](./ui/README.md)** — Frontend documentation

**Documentation Purpose:**
- `README.md` (this file) — Human quick start and overview
- `AGENTS.md` — Agent operational shortcuts
- `CONTRIBUTING.md` — How to contribute (branch, commit, PR workflow)
- `LLM.txt` — Technical deep-dive for implementation details
- Package READMEs (api/, ui/) — Package-specific details

## Architecture

**Tenant runtime** extending the everything.dev host via Module Federation:

```
┌─────────────────────────────────────────────────────────┐
│            everything.dev host (remote)                 │
│  Hono.js + oRPC + bos.config.json loader                │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Module Federation│      │ every-plugin      │         │
│  │ Runtime          │      │ Runtime           │         │
│  └────────┬─────────┘      └────────┬─────────┘         │
│           ↓                         ↓                   │
│  Loads nearbuilders UI      Loads API + Auth Plugins     │
└───────────┬─────────────────────────┬───────────────────┘
            ↓                         ↓
┌───────────────────────┐ ┌─────────────────────────────────┐
│  nearbuilders.org UI   │ │  API + 3 Domain Plugins        │
│  Builder profiles      │ │  ┌─────────┬──────────┬──────┐│
│  Project board          │ │  │ builders│ projects │ apps  ││
│  App discovery          │ │  │profiles │ideas/    │FastKV ││
│  NEAR wallet login      │ │  │+modera- │upvotes   │registry││
│  Admin dashboard        │ │  │tion     │          │      ││
└───────────────────────┘ │  └─────────┴──────────┴──────┘│
                          └─────────────────────────────────┘
```

### Plugins

Business logic lives in independent plugins loaded via Module Federation:

- **`plugins/builders/`** — Builder profiles with moderation (pending/approved/rejected), skills, NEAR Social cross-referencing, and public directory search
- **`plugins/projects/`** — Projects and ideas with upvote ranking, markdown editing, GitHub README integration, visibility controls, and on-chain app linking
- **`plugins/apps/`** — FastKV app discovery, runtime config inspection, and on-chain metadata publishing with NEAR delegate actions

Each plugin has its own `contract.ts` (oRPC routes + Zod schemas), `index.ts` (plugin factory), `rspack.config.js`, and `package.json`.

The API composes across all three plugins in-process via `createPlugin.withPlugins<PluginsClient>()`, so `apiClient.builders.*()`, `apiClient.projects.*()`, and `apiClient.apps.*()` all work without HTTP roundtrips.

### Key Features

- ✅ **Builder Directory** — Curated builder profiles with admin moderation, skills badges, and NEAR Social integration
- ✅ **Project Board** — Live-ranked projects and ideas with upvote/downvote, markdown editing, and GitHub linking
- ✅ **App Registry** — Browse, inspect, and publish on-chain runtime apps via FastKV with NEAR delegate actions
- ✅ **Runtime Configuration** — All URLs from `bos.config.json` (no rebuild needed for URL changes)
- ✅ **Independent Deployment** — UI, API, and each plugin deploy separately
- ✅ **Type Safety** — End-to-end with oRPC contracts and Zod schemas
- ✅ **Tenant Architecture** — Extends everything.dev host, inherits auth and API shell

## Configuration

All runtime configuration lives in `bos.config.json`. The key difference from the parent platform is the `extends` field:

```json
{
  "extends": "bos://dev.everything.near/everything.dev",
  "account": "work.efiz.near",
  "domain": "nearbuilders.org",
  "title": "NEAR Builders",
  "description": "The open platform for builders on NEAR.",
  "testnet": "dev.allthethings.testnet",
  "plugins": {
    "apps": {
      "development": "local:plugins/apps",
      "variables": {
        "registryNamespace": "dev.everything.near"
      },
      "routes": ["ui/src/routes/_layout/apps/**"],
      "sidebar": [
        { "icon": "Globe", "label": "apps", "roleRequired": "anon" }
      ]
    },
    "projects": {
      "development": "local:plugins/projects",
      "routes": ["ui/src/routes/_layout/_authenticated/projects/**"],
      "sidebar": [
        { "icon": "FolderKanban", "label": "projects" }
      ]
    },
    "builders": {
      "development": "local:plugins/builders",
      "routes": ["ui/src/routes/_layout/builders/**"]
    }
  }
}
```

The host, auth, and API shell are loaded from the parent runtime. This repository provides the UI and the three domain plugins.

### Environment Variables

```bash
# Host (inherited from everything.dev)
CORS_ORIGIN=http://localhost:3000
TENANT_WHITELIST=
ALLOW_UNTRUSTED_SSR=

# API
API_DATABASE_URL=postgres://everythingdev:everythingdev@localhost:5432/api_db

# Auth (inherited)
AUTH_DATABASE_URL=postgres://everythingdev:everythingdev@localhost:5433/auth_db
BETTER_AUTH_SECRET=

# plugins.projects
PROJECTS_DATABASE_URL=postgres://everythingdev:everythingdev@localhost:5435/projects_db

# plugins.builders
BUILDERS_DATABASE_URL=postgres://everythingdev:everythingdev@localhost:5434/builders_db
```

See [LLM.txt](./LLM.txt) for the complete configuration reference.

## Railway

This is a tenant deployment — the Docker image inherits from the parent and overlays nearbuilders.org configuration.

- Image source: `ghcr.io/nearbuilders/everything-dev:latest`
- Staging: `ghcr.io/nearbuilders/everything-dev:staging`

Required runtime vars (in addition to inherited ones):
- `APP_ENV` — `production` or `staging`
- `API_DATABASE_URL` — API database connection string
- `PROJECTS_DATABASE_URL` — Projects plugin database
- `BUILDERS_DATABASE_URL` — Builders plugin database
- `BETTER_AUTH_SECRET` — Session encryption key

## Lint Setup

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
bun lint        # Check linting
bun lint:fix    # Fix auto-fixable issues
bun format      # Format code
```

Biome is configured in `biome.json` at the project root. Generated files (like `routeTree.gen.ts`) are automatically excluded.

## Tech Stack

**Frontend:**
- React 19 + TanStack Router (file-based) + TanStack Query
- Tailwind CSS v4 + shadcn/ui components
- Module Federation for microfrontend architecture
- Builder directory with admin moderation workflow
- Project board with live upvote ranking (SSE)

**Backend:**
- Hono.js server + oRPC (type-safe RPC + OpenAPI)
- [every-plugin](https://plugin.everything.dev/) architecture for modular APIs
- Effect-TS for service composition
- FastKV for on-chain app metadata

**Database & Auth:**
- PostgreSQL + Drizzle ORM (4 databases: api, auth, projects, builders)
- Better-Auth with NEAR SIWN (inherited from everything.dev)

## Related Projects

- **[everything.dev](https://everything.dev)** — The parent runtime platform that nearbuilders.org extends
- **[every-plugin](https://plugin.everything.dev/)** — Plugin framework for modular APIs with typed contracts and runtime composition
- **[near-kit](https://kit.near.tools)** — Unified NEAR Protocol SDK
- **[better-near-auth](https://github.com/elliotBraem/better-near-auth)** — NEAR SIWN + gasless relay for Better-Auth

## NEAR Ecosystem

nearbuilders.org sits within a broader ecosystem building a verifiable internet on NEAR:

- **[BOS](https://near.social/)** — Composable on-chain frontend components
- **[web4](https://web4.near.page)** — Web apps as verifiable on-chain smart contracts
- **[near-dns](https://github.com/frol/near-dns)** — Blockchain-backed DNS resolution
- **[NameSky](https://namesky.app)** — Named accounts as tradeable on-chain assets
- **[OutLayer](https://outlayer.fastnear.com)** — TEE-attested verifiable off-chain computation
- **[NEAR Intents](https://intents.near.org)** — Intent-based cross-chain settlement ($15B+ volume)
- **[NEAR Catalog](https://nearcatalog.app)** — NEAR ecosystem app catalog
- **[NEAR AI](https://near.ai)** — AI agents and infrastructure on NEAR

## License

MIT