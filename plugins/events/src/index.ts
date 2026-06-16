import { createPlugin } from "every-plugin";
import { Cause, Effect, Exit, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { DatabaseLive } from "./db/layer";
import { EventService, EventServiceLive } from "./services/events";

export default createPlugin({
  variables: z.object({}),

  secrets: z.object({
    EVENTS_DATABASE_URL: z.string().default("pglite:.bos/events/:memory:"),
  }),

  context: z.object({
    userId: z.string().optional(),
    walletAddress: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    organizationId: z.string().optional(),
    apiKey: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        permissions: z.record(z.string(), z.array(z.string())).nullable(),
      })
      .optional(),
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const Database = DatabaseLive(config.secrets.EVENTS_DATABASE_URL);
      const EventServices = EventServiceLive.pipe(Layer.provide(Database));
      const event = yield* Effect.provide(EventService, EventServices);

      console.log("[Events] Services Initialized");
      return { event };
    }),

  shutdown: () => Effect.log("[Events] Shutdown"),

  createRouter: (services, builder) => {
    const requireAuth = builder.middleware(async ({ context, next }) => {
      if (!context.user || !context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication required",
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

    const getAlternateOwnerId = (context: { userId?: string; walletAddress?: string }) =>
      context.walletAddress && context.walletAddress !== context.userId
        ? context.userId
        : undefined;

    const runEffect = async <A>(effect: Effect.Effect<A, ORPCError<string, unknown>>) => {
      const exit = await Effect.runPromiseExit(effect);
      if (Exit.isFailure(exit)) {
        const squashed = Cause.squash(exit.cause);
        if (squashed instanceof ORPCError) throw squashed;
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: squashed instanceof Error ? squashed.message : String(squashed),
        });
      }
      return exit.value;
    };

    return {
      listEvents: builder.listEvents.handler(async ({ input, context }) => {
        return await runEffect(
          services.event.listEvents(
            input,
            context.walletAddress ?? context.userId,
            getAlternateOwnerId(context),
          ),
        );
      }),

      getEvent: builder.getEvent.handler(async ({ input, errors, context }) => {
        const result = await runEffect(
          services.event.getEvent(
            input.id,
            context.walletAddress ?? context.userId,
            getAlternateOwnerId(context),
          ),
        );
        if (!result) {
          throw errors.NOT_FOUND({
            message: "Event not found",
            data: { resource: "event", resourceId: input.id },
          });
        }
        return { data: result };
      }),

      listEventParticipants: builder.listEventParticipants.handler(async ({ input, errors, context }) => {
        try {
          return {
            data: await runEffect(
              services.event.listEventParticipants(
                input.eventId,
                context.walletAddress ?? context.userId,
                getAlternateOwnerId(context),
              ),
            ),
          };
        } catch (error) {
          if (error instanceof ORPCError && error.code === "NOT_FOUND") {
            throw errors.NOT_FOUND({
              message: "Event not found",
              data: { resource: "event", resourceId: input.eventId },
            });
          }
          throw error;
        }
      }),

      joinEvent: builder.joinEvent.use(requireAuth).handler(async ({ input, context, errors }) => {
        try {
          return {
            data: await runEffect(
              services.event.joinEvent(
                input.eventId,
                context.walletAddress ?? context.userId,
                context.walletAddress,
                context.user.name ?? context.user.email,
                getAlternateOwnerId(context),
              ),
            ),
          };
        } catch (error) {
          if (error instanceof ORPCError && error.code === "NOT_FOUND") {
            throw errors.NOT_FOUND({
              message: "Event not found",
              data: { resource: "event", resourceId: input.eventId },
            });
          }
          throw error;
        }
      }),

      leaveEvent: builder.leaveEvent.use(requireAuth).handler(async ({ input, context, errors }) => {
        try {
          return await runEffect(
            services.event.leaveEvent(
              input.eventId,
              context.walletAddress ?? context.userId,
              getAlternateOwnerId(context),
            ),
          );
        } catch (error) {
          if (error instanceof ORPCError && error.code === "NOT_FOUND") {
            throw errors.NOT_FOUND({
              message: "Event not found",
              data: { resource: "event", resourceId: input.eventId },
            });
          }
          throw error;
        }
      }),

      createEvent: builder.createEvent.use(requireAuth).handler(async ({ input, context }) => {
        return await runEffect(
          services.event.createEvent(
            input,
            context.walletAddress ?? context.userId,
            context.user.role,
            getAlternateOwnerId(context),
          ),
        );
      }),

      updateEvent: builder.updateEvent
        .use(requireAuth)
        .handler(async ({ input, context, errors }) => {
          try {
            return await runEffect(
              services.event.updateEvent(
                input.id,
                input,
                context.walletAddress ?? context.userId,
                context.user.role,
                getAlternateOwnerId(context),
              ),
            );
          } catch (error) {
            if (error instanceof ORPCError && error.code === "NOT_FOUND") {
              throw errors.NOT_FOUND({
                message: "Event not found",
                data: { resource: "event", resourceId: input.id },
              });
            }
            throw error;
          }
        }),

      deleteEvent: builder.deleteEvent
        .use(requireAuth)
        .handler(async ({ input, context, errors }) => {
          try {
            return await runEffect(
              services.event.deleteEvent(
                input.id,
                context.walletAddress ?? context.userId,
                context.user.role,
                getAlternateOwnerId(context),
              ),
            );
          } catch (error) {
            if (error instanceof ORPCError && error.code === "NOT_FOUND") {
              throw errors.NOT_FOUND({
                message: "Event not found",
                data: { resource: "event", resourceId: input.id },
              });
            }
            throw error;
          }
        }),
    };
  },
});
