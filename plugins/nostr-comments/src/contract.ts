import { BAD_REQUEST, FORBIDDEN, UNAUTHORIZED } from "every-plugin/errors";
import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

export const ProjectCommentSchema = z.object({
  id: z.string().describe("Nostr event id (32-byte hex)"),
  projectId: z.string().describe("NEAR Builders project ID"),
  author: z.string().describe("Author identity (NEAR account or Nostr npub)"),
  authorNpub: z.string().describe("Nostr npub of the author"),
  content: z.string().describe("Comment text"),
  createdAt: z.number().describe("Unix timestamp (seconds)"),
  replyTo: z.string().nullable().describe("Event id of parent comment, or null for top-level"),
  reactions: z.number().describe("Reaction/like count from Nostr"),
});

export const NewsPostSchema = z.object({
  id: z.string().describe("Nostr event id"),
  projectId: z.string().describe("NEAR Builders project ID"),
  type: z.enum(["update", "milestone", "funding", "announcement"]).describe("News category"),
  title: z.string().describe("News post title"),
  body: z.string().describe("News post body"),
  author: z.string().describe("NEAR account name of the author"),
  authorNpub: z.string().describe("Nostr npub of the author"),
  createdAt: z.number().describe("Unix timestamp (seconds)"),
  updatedAt: z.number().describe("Unix timestamp (seconds)"),
});

export const contract = oc.router({
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
      summary:
        "Post a comment. Provide content (server signs via NEAR-derived key) or a pre-signed event (client signs via NIP-07).",
      tags: ["Comments"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        content: z.string().min(1).max(5000).optional(),
        replyTo: z.string().optional(),
        event: z
          .object({
            id: z.string(),
            pubkey: z.string(),
            created_at: z.number(),
            kind: z.literal(1),
            tags: z.array(z.array(z.string())),
            content: z.string(),
            sig: z.string(),
          })
          .optional(),
      }),
    )
    .output(ProjectCommentSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

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
    .output(z.object({ data: z.array(NewsPostSchema) }))
    .errors({ BAD_REQUEST }),

  publishNews: oc
    .route({
      method: "POST",
      path: "/v1/projects/{projectId}/news",
      summary: "Publish a news post. Server signs using the authenticated NEAR account identity.",
      tags: ["News"],
    })
    .input(
      z.object({
        projectId: z.string().min(1),
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(10000),
        newsType: z.enum(["update", "milestone", "funding", "announcement"]),
      }),
    )
    .output(NewsPostSchema)
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

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
