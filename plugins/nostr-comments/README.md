# Nostr Comments Plugin for NEAR Builders

Lightweight social layer — project comments backed by Nostr relays.
Comments are readable by any Nostr client (Damus, Amethyst, Primal).

## Quick Start

```bash
cd plugins/nostr-comments
bun install
bun run dev    # → http://localhost:3030
```

## Relay Setup

### Option A: Public relays only (zero setup)

The plugin works out of the box using public Nostr relays. No configuration needed.

```bash
# Verify relay connectivity
bun run scripts/check-relays.ts
```

### Option B: Self-hosted relay (recommended for production)

Running your own relay gives you full control, better latency, and data ownership:

```bash
cd relay/

# Local dev (no TLS):
docker compose up -d
# → ws://localhost:7777

# Production (with automatic TLS via Caddy):
# 1. Point relay.nearbuilders.org DNS to your server
# 2. Start the stack:
docker compose -f docker-compose.caddy.yml up -d
# → wss://relay.nearbuilders.org
```

Then update your config:

```bash
# .env or plugin.dev.ts
relays=wss://relay.nearbuilders.org,wss://relay.damus.io,wss://nos.lol
```

The self-hosted relay is configured to only accept relevant event kinds:
- `kind:1` — text notes (comments)
- `kind:7` — reactions
- `kind:30078` — parameterized replaceable (news posts)
- `kind:0` — metadata (attestations)

## Register in nearbuilders.org

Add to `bos.config.json`:

```json
{
  "plugins": {
    "nostr-comments": {
      "development": "local:plugins/nostr-comments",
      "production": "remote:plugins/nostr-comments/dist/remoteEntry.js"
    }
  }
}
```

Mount the component in the project detail page:

```tsx
import { lazy, Suspense } from "react";

const ProjectComments = lazy(() => import("nostr_comments/ProjectComments"));

// After project markdown body:
<Suspense fallback={null}>
  <ProjectComments projectId={project.id} />
</Suspense>
```

## API

### Comments (Nostr kind:1)

```
GET  /v1/projects/:projectId/comments?limit=50
POST /v1/projects/:projectId/comments
     { projectId, event: NostrEvent }
```

### News (Nostr kind:30078)

```
GET  /v1/projects/:projectId/news?type=update&limit=20
POST /v1/projects/:projectId/news
     { projectId, event: NostrEvent }
```

### Attestation (NEP-413)

```
POST /v1/nostr/attest
     { accountId, publicKey, signature, message, nonce, recipient, nostrPubkey, createdAt }

GET  /v1/nostr/attest/:accountId
```

### Health

```
GET  /ping → { status: "ok", relay: "...", timestamp: "..." }
```

## Nostr Event Format

### Comment (kind:1)

```json
{
  "kind": 1,
  "content": "This project is fire",
  "tags": [
    ["t", "nbs"],
    ["p", "alice.near"],
    ["project", "proj_abc123"],
    ["e", "<parent-event-id>", "", "reply"]
  ]
}
```

### News Post (kind:30078)

```json
{
  "kind": 30078,
  "content": "We just shipped v2!",
  "tags": [
    ["d", "proj_abc123-update-1709000000"],
    ["t", "nbs-news"],
    ["project", "proj_abc123"],
    ["news_type", "update"],
    ["title", "v2 Release Notes"],
    ["p", "alice.near"]
  ]
}
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `relays` | No | `wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net` | Primary relays |
| `fallbackRelays` | No | `wss://relay.snort.social,wss://nostr.wine` | Fallback relays |
| `NOSTR_COMMENTS_DATABASE_URL` | No | `pglite:.bos/nostr-comments/:memory:` | Postgres or PGlite URL |
| `NOSTR_SYSTEM_SECRET` | No | — | Server-side hex key for platform posts |

## Scripts

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run test         # Run tests
bun run lint         # Lint with Biome
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run scripts/check-relays.ts  # Check relay connectivity
```
