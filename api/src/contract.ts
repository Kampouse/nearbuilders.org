import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, UNAUTHORIZED } from "every-plugin/errors";
import { eventIterator, oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

const ReviewStatus = z.enum(["pending", "approved", "rejected", "removed"]);
const ApplyStatus = z.enum(["not_started", "applied", "failed"]);
const RemoveStatus = z.enum(["not_started", "removed", "failed"]);

export const VoteEventSchema = z.object({
  type: z.enum(["upvote", "downvote"]),
  entityId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  totalCount: z.number().int().nonnegative(),
});

export const ProposalSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  entityId: z.string(),
  operation: z.literal("create"),
  payload: z.unknown(),
  schemaVersion: z.string(),
  createdBy: z.string(),
  reviewStatus: ReviewStatus,
  applyStatus: ApplyStatus,
  removeStatus: RemoveStatus,
  rejectionReason: z.string().nullable(),
  applyError: z.string().nullable(),
  removeError: z.string().nullable(),
  appliedResourceId: z.string().nullable(),
  submissionCount: z.number().int().nonnegative(),
  appliedAt: z.iso.datetime().nullable(),
  removedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const ProposalAuditEntrySchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  entityId: z.string(),
  action: z.string(),
  actor: z.string(),
  actorLabel: z.string().nullable(),
  details: z.unknown().nullable(),
  createdAt: z.iso.datetime(),
});

export const ProposalEventSchema = z.object({
  action: z.string(),
  pluginId: z.string(),
  entityId: z.string(),
  reviewStatus: ReviewStatus,
  applyStatus: ApplyStatus,
  removeStatus: RemoveStatus,
  submissionCount: z.number().int().nonnegative(),
  timestamp: z.iso.datetime(),
});

export const contract = oc.router({
  ping: oc.route({ method: "GET", path: "/ping" }).output(
    z.object({
      status: z.literal("ok"),
      timestamp: z.iso.datetime(),
    }),
  ),

  authHealth: oc
    .route({ method: "GET", path: "/auth/health" })
    .output(
      z.object({
        status: z.string(),
        emailConfigured: z.boolean(),
        smsConfigured: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  propose: oc
    .route({ method: "POST", path: "/proposals" })
    .input(
      z.object({
        pluginId: z.string().min(1).max(100),
        entityId: z.string().min(1).max(255),
        payload: z.unknown(),
        source: z.string().max(100).optional(),
        metadata: z.unknown().optional(),
        idempotencyKey: z.string().max(255).optional(),
      }),
    )
    .output(z.object({ data: ProposalSchema }))
    .errors({ UNAUTHORIZED, BAD_REQUEST }),

  approve: oc
    .route({ method: "POST", path: "/proposals/{pluginId}/{entityId}/approve" })
    .input(z.object({ pluginId: z.string(), entityId: z.string() }))
    .output(z.object({ data: ProposalSchema }))
    .errors({ UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST }),

  reject: oc
    .route({ method: "POST", path: "/proposals/{pluginId}/{entityId}/reject" })
    .input(
      z.object({
        pluginId: z.string(),
        entityId: z.string(),
        reason: z.string().max(1000).optional(),
      }),
    )
    .output(z.object({ data: ProposalSchema }))
    .errors({ UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST }),

  remove: oc
    .route({ method: "DELETE", path: "/proposals/{pluginId}/{entityId}" })
    .input(z.object({ pluginId: z.string(), entityId: z.string() }))
    .output(z.object({ data: ProposalSchema }))
    .errors({ UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST }),

  getProposals: oc
    .route({ method: "GET", path: "/proposals" })
    .input(
      z.object({
        pluginId: z.string().optional(),
        entityId: z.string().optional(),
        reviewStatus: ReviewStatus.optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(ProposalSchema),
        meta: z.object({
          total: z.number().int().nonnegative(),
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    ),

  getProposalCount: oc
    .route({ method: "GET", path: "/proposals/{pluginId}/{entityId}/count" })
    .input(z.object({ pluginId: z.string(), entityId: z.string() }))
    .output(
      z.object({
        pluginId: z.string(),
        entityId: z.string(),
        totalCount: z.number().int().nonnegative(),
      }),
    ),

  getAuditLog: oc
    .route({ method: "GET", path: "/proposals/{pluginId}/{entityId}/audit" })
    .input(
      z.object({
        pluginId: z.string(),
        entityId: z.string(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .output(z.object({ data: z.array(ProposalAuditEntrySchema) })),

  subscribeProposals: oc
    .route({ method: "GET", path: "/proposals/stream" })
    .input(
      z.object({
        pluginId: z.string().optional(),
        entityId: z.string().optional(),
      }),
    )
    .output(eventIterator(ProposalEventSchema)),

  upvote: oc
    .route({ method: "POST", path: "/upvotes" })
    .input(z.object({ entityId: z.string() }))
    .output(
      z.object({
        entityId: z.string(),
        userId: z.string(),
        totalCount: z.number().int().nonnegative(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST }),

  downvote: oc
    .route({ method: "DELETE", path: "/upvotes/{entityId}" })
    .input(z.object({ entityId: z.string() }))
    .output(
      z.object({
        entityId: z.string(),
        totalCount: z.number().int().nonnegative(),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND }),

  getUpvoteCount: oc
    .route({ method: "GET", path: "/upvotes/{entityId}/count" })
    .input(z.object({ entityId: z.string() }))
    .output(
      z.object({
        entityId: z.string(),
        totalCount: z.number().int().nonnegative(),
      }),
    ),

  getUserVote: oc
    .route({ method: "GET", path: "/upvotes/{entityId}/me" })
    .input(z.object({ entityId: z.string() }))
    .output(
      z.object({
        entityId: z.string(),
        hasUpvote: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  getUpvoteFeed: oc
    .route({ method: "GET", path: "/upvotes/feed" })
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            id: z.string(),
            entityId: z.string(),
            userId: z.string(),
            createdAt: z.iso.datetime(),
          }),
        ),
        meta: z.object({
          total: z.number().int().nonnegative(),
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    ),

  subscribeUpvotes: oc
    .route({ method: "GET", path: "/upvotes/stream" })
    .output(eventIterator(VoteEventSchema)),
});

export type ContractType = typeof contract;
