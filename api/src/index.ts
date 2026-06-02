import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { createAuthMiddleware } from "./lib/auth";
import type { PluginsClient } from "./lib/plugins-types.gen";

type ApiContext = {
  userId?: string;
  user?: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };
  organizationId?: string;
  reqHeaders?: Headers;
  getRawBody?: () => Promise<string>;
};

type ProposalData = {
  pluginId: string;
  entityId: string;
  payload: unknown;
  appliedResourceId: string | null;
};

function pluginContext(context: ApiContext) {
  return {
    userId: context.userId,
    user: context.user,
    reqHeaders: context.reqHeaders,
    getRawBody: context.getRawBody,
  };
}

function requireObjectPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ORPCError("BAD_REQUEST", { message: "Proposal payload must be an object" });
  }
  return payload as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

type CreateCallback = (
  plugins: Omit<PluginsClient, "auth">,
  proposal: ProposalData,
  context: ApiContext,
) => Promise<string>;

type RemoveCallback = (
  plugins: Omit<PluginsClient, "auth">,
  proposal: ProposalData,
  context: ApiContext,
) => Promise<void>;

const createCallbacks: Record<string, CreateCallback> = {
  builders: async (plugins, proposal, context) => {
    const payload = requireObjectPayload(proposal.payload);
    const result = await plugins.builders(pluginContext(context)).createBuilder({
      nearAccount: proposal.entityId,
      userId: readString(payload.userId),
      name: readString(payload.name),
      bio: readString(payload.bio),
      skills: readStringArray(payload.skills),
      location: readString(payload.location),
      links:
        payload.links && typeof payload.links === "object" && !Array.isArray(payload.links)
          ? (payload.links as Record<string, string>)
          : undefined,
    });
    return result.data.nearAccount;
  },
  projects: async (plugins, proposal, context) => {
    const payload = requireObjectPayload(proposal.payload);
    const result = await plugins.projects(pluginContext(context)).createProject({
      id: proposal.entityId,
      kind: payload.kind === "idea" ? "idea" : "project",
      title: readString(payload.title) ?? proposal.entityId,
      slug: readString(payload.slug) ?? proposal.entityId,
      description: readString(payload.description),
      content: readString(payload.content),
      visibility:
        payload.visibility === "private" || payload.visibility === "unlisted"
          ? payload.visibility
          : "public",
      repository: readString(payload.repository),
      organizationId: readString(payload.organizationId),
      ownerId: readString(payload.ownerId),
      domain: readString(payload.domain),
    });
    return result.id;
  },
};

const removeCallbacks: Record<string, RemoveCallback> = {
  builders: async (plugins, proposal, context) => {
    await plugins.builders(pluginContext(context)).deleteBuilder({
      nearAccount: proposal.entityId,
    });
  },
  projects: async (plugins, proposal, context) => {
    const projectId = proposal.appliedResourceId ?? proposal.entityId;
    await plugins.projects(pluginContext(context)).deleteProject({ id: projectId });
  },
};

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({}),

  secrets: z.object({}),

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
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
  }),

  contract,

  initialize: (_config, plugins) =>
    Effect.sync(() => {
      const { auth, ...restPlugins } = plugins;
      console.log("[API] Services Initialized");
      console.log("[API] Auth client available:", Boolean(auth));
      console.log("[API] Plugins available:", Object.keys(restPlugins).join(", ") || "none");
      return { auth, plugins: restPlugins };
    }),

  shutdown: () => Effect.log("[API] Shutdown"),

  createRouter: (services, builder) => {
    const { requireAuth, requireAdmin, requireAuthOrApiKey } = createAuthMiddleware(builder);

    return {
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      authHealth: builder.authHealth.use(requireAuth).handler(async () => ({
        status: "ok",
        emailConfigured: !!process.env.EMAIL_PROVIDER,
        smsConfigured: !!process.env.SMS_PROVIDER,
      })),

      propose: builder.propose.use(requireAuthOrApiKey).handler(async ({ input, context }) => {
        return await services.plugins.proposals(pluginContext(context)).propose(input);
      }),

      approve: builder.approve.use(requireAdmin).handler(async ({ input, context }) => {
        const proposalsClient = services.plugins.proposals(pluginContext(context));
        const approval = await proposalsClient.approve(input);
        const proposal: ProposalData = {
          pluginId: approval.data.pluginId,
          entityId: approval.data.entityId,
          payload: approval.data.payload,
          appliedResourceId: approval.data.appliedResourceId,
        };

        if (approval.data.applyStatus === "applied") {
          return approval;
        }

        const createCallback = createCallbacks[proposal.pluginId];
        if (!createCallback) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Unsupported pluginId: ${proposal.pluginId}`,
          });
        }

        const applyAttempt = Effect.tryPromise({
          try: async () => await createCallback(services.plugins, proposal, context),
          catch: (error) =>
            new ORPCError("INTERNAL_SERVER_ERROR", {
              message: error instanceof Error ? error.message : String(error),
            }),
        });

        let appliedResourceId: string;
        try {
          appliedResourceId = await Effect.runPromise(applyAttempt);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await proposalsClient.markApplyFailed({
            pluginId: input.pluginId,
            entityId: input.entityId,
            error: message,
          });
          throw error;
        }

        return await proposalsClient.markApplied({
          pluginId: input.pluginId,
          entityId: input.entityId,
          appliedResourceId,
        });
      }),

      reject: builder.reject.use(requireAdmin).handler(async ({ input, context }) => {
        return await services.plugins.proposals(pluginContext(context)).reject(input);
      }),

      remove: builder.remove.use(requireAdmin).handler(async ({ input, context }) => {
        const proposalsClient = services.plugins.proposals(pluginContext(context));
        const listed = await proposalsClient.getProposals({
          pluginId: input.pluginId,
          entityId: input.entityId,
          limit: 1,
        });
        const proposalData = listed.data[0];

        if (!proposalData) {
          throw new ORPCError("NOT_FOUND", { message: "Proposal not found" });
        }

        const removal = await proposalsClient.remove(input);

        const proposal: ProposalData = {
          pluginId: proposalData.pluginId,
          entityId: proposalData.entityId,
          payload: proposalData.payload,
          appliedResourceId: proposalData.appliedResourceId,
        };

        if (proposalData.applyStatus === "applied") {
          const removeCallback = removeCallbacks[proposal.pluginId];
          if (!removeCallback) {
            throw new ORPCError("BAD_REQUEST", {
              message: `Unsupported pluginId: ${proposal.pluginId}`,
            });
          }

          const removeAttempt = Effect.tryPromise({
            try: async () => await removeCallback(services.plugins, proposal, context),
            catch: (error) =>
              new ORPCError("INTERNAL_SERVER_ERROR", {
                message: error instanceof Error ? error.message : String(error),
              }),
          });

          try {
            await Effect.runPromise(removeAttempt);
            return await proposalsClient.markRemoved({
              pluginId: input.pluginId,
              entityId: input.entityId,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await proposalsClient.markRemoveFailed({
              pluginId: input.pluginId,
              entityId: input.entityId,
              error: message,
            });
            throw error;
          }
        }

        return removal;
      }),

      getProposals: builder.getProposals.handler(async ({ input }) => {
        return await services.plugins.proposals().getProposals(input);
      }),

      getProposalCount: builder.getProposalCount.handler(async ({ input }) => {
        return await services.plugins.proposals().getProposalCount(input);
      }),

      getAuditLog: builder.getAuditLog.handler(async ({ input }) => {
        return await services.plugins.proposals().getAuditLog(input);
      }),

      subscribeProposals: builder.subscribeProposals.handler(async function* ({ input }) {
        const iterator = await services.plugins.proposals().subscribe(input);
        for await (const event of iterator) {
          yield event;
        }
      }),

      upvote: builder.upvote.use(requireAuth).handler(async ({ input, context }) => {
        return await services.plugins.votes(pluginContext(context)).upvote(input);
      }),

      downvote: builder.downvote.use(requireAuth).handler(async ({ input, context }) => {
        return await services.plugins.votes(pluginContext(context)).downvote(input);
      }),

      getUpvoteCount: builder.getUpvoteCount.handler(async ({ input }) => {
        return await services.plugins.votes().getUpvoteCount(input);
      }),

      getUserVote: builder.getUserVote.use(requireAuth).handler(async ({ input, context }) => {
        return await services.plugins.votes(pluginContext(context)).getUserVote(input);
      }),

      getUpvoteFeed: builder.getUpvoteFeed.handler(async ({ input }) => {
        return await services.plugins.votes().getUpvoteFeed(input);
      }),

      subscribeUpvotes: builder.subscribeUpvotes.handler(async function* () {
        const iterator = await services.plugins.votes().subscribe();
        for await (const event of iterator) {
          yield event;
        }
      }),
    };
  },
});
