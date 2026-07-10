import { createPlugin } from "every-plugin";
import { Cause, Effect, Exit } from "every-plugin/effect";
import { MemoryPublisher, ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import type { NostrEvent } from "nostr-tools/pure";
import { contract } from "./contract";
import { NostrCommentService, NostrCommentServiceLive } from "./services/nostr-comments";

type BackgroundEvents = {
  "new-comment": { id: string; projectId: string; timestamp: number };
  "new-news": { id: string; projectId: string; timestamp: number };
};

export default createPlugin({
  variables: z.object({
    relays: z.string().describe("Comma-separated list of primary Nostr relay URLs").optional(),
    fallbackRelays: z.string().describe("Comma-separated list of fallback relay URLs").optional(),
    backgroundEnabled: z.boolean().default(false),
    backgroundIntervalMs: z.number().min(1000).max(60000).default(5000),
  }),

  secrets: z.object({
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
        member: z.object({ id: z.string(), role: z.string() }).nullable().optional(),
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
      const NostrServices = NostrCommentServiceLive({
        variables: {
          relays: config.variables.relays,
          fallbackRelays: config.variables.fallbackRelays,
        },
        systemSecret: config.secrets.NOSTR_SYSTEM_SECRET,
      });
      const nostr = yield* Effect.provide(NostrCommentService, NostrServices);

      const publisher = new MemoryPublisher<BackgroundEvents>({
        resumeRetentionSeconds: 120,
      });

      console.log("[NostrComments] Services Initialized");

      if (config.variables.backgroundEnabled) {
        yield* Effect.forkScoped(
          Effect.gen(function* () {
            while (true) {
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
          near: context.near,
          reqHeaders: context.reqHeaders,
        },
      });
    });

    async function runEffect<A>(effect: Effect.Effect<A, ORPCError<string, unknown>>) {
      const exit = await Effect.runPromiseExit(effect);
      if (Exit.isFailure(exit)) {
        const squashed = Cause.squash(exit.cause);
        if (squashed instanceof ORPCError) throw squashed;
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: squashed instanceof Error ? squashed.message : String(squashed),
        });
      }
      return exit.value;
    }

    return {
      listComments: builder.listComments.handler(async ({ input }) => {
        return runEffect(nostr.listComments(input.projectId, input.limit, input.cursor));
      }),

      createComment: builder.createComment.use(requireAuth).handler(async ({ input, context }) => {
        let result: {
          id: string;
          projectId: string;
          author: string;
          authorNpub: string;
          content: string;
          createdAt: number;
          replyTo: string | null;
          reactions: number;
        };

        if (input.event) {
          result = await runEffect(
            nostr.publishSignedComment(input.projectId, input.event as NostrEvent),
          );
        } else {
          const accountId = context.walletAddress ?? context.near?.primaryAccountId;
          if (!accountId) {
            throw new ORPCError("UNAUTHORIZED", {
              message: "No NEAR account linked. Connect a Nostr extension or sign in with NEAR.",
            });
          }
          if (!input.content) {
            throw new ORPCError("BAD_REQUEST", { message: "Content or event is required" });
          }
          result = await runEffect(
            nostr.publishComment(input.projectId, accountId, input.content, input.replyTo),
          );
        }

        await publisher.publish("new-comment", {
          id: result.id,
          projectId: input.projectId,
          timestamp: Date.now(),
        });

        return result;
      }),

      listNews: builder.listNews.handler(async ({ input }) => {
        return runEffect(nostr.listNews(input.projectId, input.limit, input.type));
      }),

      publishNews: builder.publishNews.use(requireAuth).handler(async ({ input, context }) => {
        if (context.user?.role && context.user.role !== "admin" && context.user.role !== "owner") {
          throw new ORPCError("FORBIDDEN", {
            message: "Only project owners or admins can publish news",
          });
        }

        const accountId = context.walletAddress ?? context.near?.primaryAccountId;
        if (!accountId) {
          throw new ORPCError("UNAUTHORIZED", {
            message: "No NEAR account linked to this session",
          });
        }

        const result = await runEffect(
          nostr.publishNews(input.projectId, accountId, input.content, input.title, input.newsType),
        );

        await publisher.publish("new-news", {
          id: result.id,
          projectId: input.projectId,
          timestamp: Date.now(),
        });

        return result;
      }),

      ping: builder.ping.handler(async () => {
        const result = await runEffect(nostr.ping());
        return {
          status: "ok" as const,
          relay: result.relay,
          timestamp: new Date().toISOString(),
        };
      }),
    };
  },
});
