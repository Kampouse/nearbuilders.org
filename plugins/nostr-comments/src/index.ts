import { createPlugin } from "every-plugin";
import { Cause, Effect, Exit, Layer } from "every-plugin/effect";
import { getEventMeta, MemoryPublisher, ORPCError } from "every-plugin/orpc";
import { verifyEvent, type NostrEvent } from "nostr-tools/pure";
import { bech32 } from "@scure/base";
import { hexToBytes } from "@noble/hashes/utils";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { DatabaseLive } from "./db/layer";
import {
  NostrCommentService,
  NostrCommentServiceLive,
} from "./services/nostr-comments";
import { verifyAttestation } from "./attestation";

// Background events for SSE streaming
type BackgroundEvents = {
  "new-comment": { id: string; projectId: string; timestamp: number };
  "new-news": { id: string; projectId: string; timestamp: number };
};

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({
    relays: z
      .string()
      .describe("Comma-separated list of primary Nostr relay URLs")
      .optional(),
    fallbackRelays: z
      .string()
      .describe("Comma-separated list of fallback relay URLs")
      .optional(),
    backgroundEnabled: z.boolean().default(false),
    backgroundIntervalMs: z.number().min(1000).max(60000).default(5000),
  }),

  secrets: z.object({
    NOSTR_COMMENTS_DATABASE_URL: z
      .string()
      .default("pglite:.bos/nostr-comments/:memory:"),
    NOSTR_SYSTEM_SECRET: z.string().optional(),
  }),

  context: z.object({
    userId: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    organizationId: z.string().optional(),
    organization: z
      .object({
        activeOrganizationId: z.string().nullable().optional(),
        organization: z
          .object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            logo: z.string().nullable().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
          .nullable()
          .optional(),
        member: z
          .object({ id: z.string(), role: z.string() })
          .nullable()
          .optional(),
        isPersonal: z.boolean(),
        hasOrganization: z.boolean(),
      })
      .optional(),
    near: z
      .object({
        primaryAccountId: z.string().nullable(),
        linkedAccounts: z.array(
          z.object({
            accountId: z.string(),
            network: z.string(),
            publicKey: z.string(),
            isPrimary: z.boolean(),
          }),
        ),
        hasNearAccount: z.boolean(),
      })
      .optional(),
    walletAddress: z.string().optional(),
    apiKey: z
      .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
      })
      .optional(),
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      // Database
      const Database = DatabaseLive(config.secrets.NOSTR_COMMENTS_DATABASE_URL);

      // Services
      const NostrServices = NostrCommentServiceLive({
        variables: {
          relays: config.variables.relays,
          fallbackRelays: config.variables.fallbackRelays,
        },
      }).pipe(Layer.provide(Database));
      const nostr = yield* Effect.provide(NostrCommentService, NostrServices);

      // Background publisher for real-time comment streaming
      const publisher = new MemoryPublisher<BackgroundEvents>({
        resumeRetentionSeconds: 120,
      });

      console.log("[NostrComments] Services Initialized");

      // Optional: poll relays for new comments and publish to SSE subscribers
      if (config.variables.backgroundEnabled) {
        yield* Effect.forkScoped(
          Effect.gen(function* () {
            while (true) {
              // In production: subscribe to relay updates and publish events
              yield* Effect.sleep(`${config.variables.backgroundIntervalMs} millis`);
            }
          }),
        );
      }

      return { nostr, publisher };
    }),

  shutdown: () => Effect.log("[NostrComments] Shutdown"),

  createRouter: (services, builder) => {
    const { nostr, publisher } = services;

    // ── Auth middleware (matches projects plugin) ────────────────────────
    const requireAuth = builder.middleware(async ({ context, next }) => {
      if (!context.user || !context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication required",
          data: {
            authType: "session",
            hint: "Sign in with NEAR, passkey, email, phone, or anonymous",
          },
        });
      }
      return next({
        context: {
          userId: context.userId,
          walletAddress: context.walletAddress,
          user: context.user,
          reqHeaders: context.reqHeaders,
        },
      });
    });

    return {
      // ── listComments ──────────────────────────────────────────────────
      listComments: builder.listComments.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          nostr.listComments(input.projectId, input.limit, input.cursor),
        );

        if (Exit.isFailure(exit)) {
          const squashed = Cause.squash(exit.cause);
          if (squashed instanceof ORPCError) throw squashed;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: squashed instanceof Error ? squashed.message : String(squashed),
          });
        }

        return exit.value;
      }),

      // ── createComment ─────────────────────────────────────────────────
      createComment: builder.createComment
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          // Verify the Nostr event signature
          if (!verifyEvent(input.event as NostrEvent)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Invalid Nostr event signature",
            });
          }

          const exit = await Effect.runPromiseExit(
            nostr.publishComment(input.projectId, input.event as NostrEvent),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) throw squashed;
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
            });
          }

          // Broadcast to SSE subscribers
          await Effect.runPromise(
            publisher.publish("new-comment", {
              id: exit.value.id,
              projectId: input.projectId,
              timestamp: Date.now(),
            }),
          );

          return exit.value;
        }),

      // ── listNews ──────────────────────────────────────────────────────
      listNews: builder.listNews.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          nostr.listNews(input.projectId, input.type, input.limit),
        );

        if (Exit.isFailure(exit)) {
          const squashed = Cause.squash(exit.cause);
          if (squashed instanceof ORPCError) throw squashed;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: squashed instanceof Error ? squashed.message : String(squashed),
          });
        }

        return exit.value;
      }),

      // ── publishNews ───────────────────────────────────────────────────
      publishNews: builder.publishNews
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          if (context.user?.role && context.user.role !== "admin" && context.user.role !== "owner") {
            throw new ORPCError("FORBIDDEN", {
              message: "Only project owners or admins can publish news",
            });
          }

          if (!verifyEvent(input.event as NostrEvent)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Invalid Nostr event signature",
            });
          }

          const exit = await Effect.runPromiseExit(
            nostr.publishNews(input.projectId, input.event as NostrEvent),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) throw squashed;
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
            });
          }

          await Effect.runPromise(
            publisher.publish("new-news", {
              id: exit.value.id,
              projectId: input.projectId,
              timestamp: Date.now(),
            }),
          );

          return exit.value;
        }),

      // ── attestNostr ───────────────────────────────────────────────────
      attestNostr: builder.attestNostr
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const authedAccount = context.walletAddress ?? context.user?.name;
          if (authedAccount && authedAccount !== input.accountId) {
            throw new ORPCError("FORBIDDEN", {
              message: `Cannot attest for ${input.accountId} while logged in as ${authedAccount}`,
            });
          }

          const result = verifyAttestation({
            accountId: input.accountId,
            publicKey: input.publicKey,
            signature: input.signature,
            message: input.message,
            nonce: input.nonce,
            recipient: input.recipient,
            nostrPubkey: input.nostrPubkey,
            createdAt: input.createdAt,
          });

          if (!result.valid) {
            throw new ORPCError("BAD_REQUEST", {
              message: result.error ?? "Attestation verification failed",
            });
          }

          const exit = await Effect.runPromiseExit(
            nostr.saveAttestation({
              accountId: input.accountId,
              nostrPubkey: input.nostrPubkey,
              publicKey: input.publicKey,
              signature: input.signature,
              nonce: input.nonce,
              recipient: input.recipient,
              message: input.message,
            }),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) throw squashed;
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
            });
          }

          const npub = bech32.encode(
            "npub",
            bech32.toWords(hexToBytes(input.nostrPubkey)),
          );

          return {
            verified: true,
            accountId: result.accountId,
            nostrPubkey: result.nostrPubkey,
            npub,
            error: null,
          };
        }),

      // ── getAttestation ────────────────────────────────────────────────
      getAttestation: builder.getAttestation.handler(async ({ input }) => {
        const exit = await Effect.runPromiseExit(
          nostr.getAttestation(input.accountId),
        );

        if (Exit.isFailure(exit)) {
          const squashed = Cause.squash(exit.cause);
          if (squashed instanceof ORPCError) throw squashed;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: squashed instanceof Error ? squashed.message : String(squashed),
          });
        }

        const record = exit.value;
        return {
          attested: record?.verified ?? false,
          accountId: input.accountId,
          nostrPubkey: record?.nostrPubkey ?? null,
          npub: record?.npub ?? null,
          attestedAt: record ? Math.floor(new Date(record.createdAt).getTime() / 1000) : null,
        };
      }),

      // ── ping ──────────────────────────────────────────────────────────
      ping: builder.ping.handler(async () => {
        const exit = await Effect.runPromiseExit(nostr.ping());

        if (Exit.isFailure(exit)) {
          const squashed = Cause.squash(exit.cause);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: squashed instanceof Error ? squashed.message : String(squashed),
          });
        }

        return {
          status: "ok" as const,
          relay: exit.value.relay,
          timestamp: new Date().toISOString(),
        };
      }),
    };
  },
});
