import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, UNAUTHORIZED } from "every-plugin/errors";
import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

/**
 * A comment on a project, backed by a Nostr kind:1 event.
 * Tags: ["t", "nbs"], ["p", "<near-account>"], ["project", "<project-id>"]
 */
export const ProjectCommentSchema = z.object({
  id: z.string().describe("Nostr event id (32-byte hex)"),
  projectId: z.string().describe("NEAR Builders project ID"),
  author: z.string().describe("NEAR account or display name"),
  authorNpub: z.string().describe("Nostr npub of the author"),
  content: z.string().describe("Comment text (markdown)"),
  createdAt: z.number().describe("Unix timestamp (seconds)"),
  replyTo: z.string().nullable().describe("Event id of parent comment, or null for top-level"),
  reactions: z.number().describe("Reaction/like count from Nostr"),
});

/**
 * A news/announcement post, backed by a Nostr kind:30078
 * (parameterized replaceable) event.
 */
export const NewsPostSchema = z.object({
  id: z.string().describe("Nostr event id"),
  projectId: z.string().describe("NEAR Builders project ID"),
  type: z.enum(["update", "milestone", "funding", "announcement"]).describe("News category"),
  title: z.string().describe("News post title"),
  body: z.string().describe("News post body (markdown)"),
  author: z.string().describe("NEAR account or display name"),
  authorNpub: z.string().describe("Nostr npub of the author"),
  createdAt: z.number().describe("Unix timestamp (seconds)"),
  updatedAt: z.number().describe("Unix timestamp (seconds)"),
});

// ── Contract ─────────────────────────────────────────────────────────────────

export const contract = oc.router({
  // ── Comments ───────────────────────────────────────────────────────────────

  listComments: oc
    .route({
      method: "GET",
      path: "/v1/projects/{projectId}/comments",
      summary: "List project comments from Nostr relay",
      tags: ["Comments"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.number().describe("Unix timestamp cursor for pagination").optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(ProjectCommentSchema),
        meta: z.object({
          total: z.number().int().nonnegative(),
          hasMore: z.boolean(),
          oldestCreatedAt: z.number().nullable(),
        }),
      }),
    )
    .errors({ BAD_REQUEST }),

  createComment: oc
    .route({
      method: "POST",
      path: "/v1/projects/{projectId}/comments",
      summary: "Post a comment to a project. Accepts a pre-signed Nostr kind:1 event.",
      tags: ["Comments"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        /** A fully signed Nostr kind:1 event from the client's signer */
        event: z.object({
          id: z.string(),
          pubkey: z.string(),
          created_at: z.number(),
          kind: z.literal(1),
          tags: z.array(z.array(z.string())),
          content: z.string(),
          sig: z.string(),
        }),
      }),
    )
    .output(ProjectCommentSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

  // ── News ───────────────────────────────────────────────────────────────────

  listNews: oc
    .route({
      method: "GET",
      path: "/v1/projects/{projectId}/news",
      summary: "List project news posts from Nostr relay",
      tags: ["News"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        type: z.enum(["update", "milestone", "funding", "announcement"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .output(
      z.object({
        data: z.array(NewsPostSchema),
      }),
    )
    .errors({ BAD_REQUEST }),

  publishNews: oc
    .route({
      method: "POST",
      path: "/v1/projects/{projectId}/news",
      summary: "Publish a news post. Accepts a pre-signed Nostr kind:30078 event.",
      tags: ["News"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        /** A fully signed Nostr kind:30078 event from the client's signer */
        event: z.object({
          id: z.string(),
          pubkey: z.string(),
          created_at: z.number(),
          kind: z.literal(30078),
          tags: z.array(z.array(z.string())),
          content: z.string(),
          sig: z.string(),
        }),
      }),
    )
    .output(NewsPostSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

  // ── Attestation (NEAR → Nostr identity link) ───────────────────────────────

  attestNostr: oc
    .route({
      method: "POST",
      path: "/v1/nostr/attest",
      summary: "Submit a NEP-413 attestation linking a NEAR account to a Nostr npub",
      description:
        "Verifies the NEAR wallet signature and stores the attestation. " +
        "After attestation, comments from this npub show as ✅ verified.",
      tags: ["Attestation"],
    })
    .input(
      z.object({
        accountId: z.string().describe("NEAR account name (e.g. alice.near)"),
        publicKey: z.string().describe("NEAR public key (ed25519:...)"),
        signature: z.string().describe("Base64 Ed25519 signature"),
        message: z.string().describe("The attestation message JSON that was signed"),
        nonce: z.string().describe("Base64-encoded 32-byte nonce"),
        recipient: z.string().describe("Recipient specified during signing"),
        nostrPubkey: z.string().describe("Hex Nostr pubkey being attested"),
        createdAt: z.number().describe("Unix timestamp of attestation"),
      }),
    )
    .output(
      z.object({
        verified: z.boolean().describe("Whether the attestation signature is valid"),
        accountId: z.string(),
        nostrPubkey: z.string(),
        npub: z.string().describe("Bech32-encoded Nostr pubkey"),
        error: z.string().nullable().describe("Error message if verification failed"),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST }),

  getAttestation: oc
    .route({
      method: "GET",
      path: "/v1/nostr/attest/{accountId}",
      summary: "Check if a NEAR account has an attested Nostr identity",
      tags: ["Attestation"],
    })
    .input(z.object({ accountId: z.string() }))
    .output(
      z.object({
        attested: z.boolean(),
        accountId: z.string(),
        nostrPubkey: z.string().nullable(),
        npub: z.string().nullable(),
        attestedAt: z.number().nullable(),
      }),
    )
    .errors({ NOT_FOUND }),

  // ── Health ─────────────────────────────────────────────────────────────────

  ping: oc
    .route({
      method: "GET",
      path: "/ping",
      summary: "Health check",
      tags: ["Health"],
    })
    .output(
      z.object({
        status: z.literal("ok"),
        relay: z.string().describe("Connected relay URL"),
        timestamp: z.string().datetime(),
      }),
    ),
});

export type ContractType = typeof contract;
