import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
import { Context, Effect, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, type NostrEvent, verifyEvent } from "nostr-tools/pure";
import { Relay, useWebSocketImplementation } from "nostr-tools/relay";

if (typeof globalThis.WebSocket !== "undefined") {
  useWebSocketImplementation(globalThis.WebSocket);
}

export interface Comment {
  id: string;
  projectId: string;
  author: string;
  authorNpub: string;
  content: string;
  createdAt: number;
  replyTo: string | null;
  reactions: number;
}

export interface NewsPost {
  id: string;
  projectId: string;
  type: "update" | "milestone" | "funding" | "announcement";
  title: string;
  body: string;
  author: string;
  authorNpub: string;
  createdAt: number;
  updatedAt: number;
}

interface CommentListResult {
  data: Comment[];
  meta: { total: number; hasMore: boolean; oldestCreatedAt: number | null };
}

function hexToNpub(hex: string): string {
  return bech32.encode("npub", bech32.toWords(hexToBytes(hex)));
}

function getTagValue(event: NostrEvent, name: string): string | null {
  const tag = event.tags.find((t) => t[0] === name);
  return tag ? tag[1] : null;
}

function eventToComment(event: NostrEvent): Comment {
  const replyTag = event.tags.find((t) => t[0] === "e" && t[3] === "reply");
  return {
    id: event.id,
    projectId: getTagValue(event, "project") ?? "",
    author: getTagValue(event, "p") ?? "anonymous",
    authorNpub: hexToNpub(event.pubkey),
    content: event.content,
    createdAt: event.created_at,
    replyTo: replyTag ? replyTag[1] : null,
    reactions: 0,
  };
}

function eventToNewsPost(event: NostrEvent): NewsPost {
  return {
    id: event.id,
    projectId: getTagValue(event, "project") ?? "",
    type: (getTagValue(event, "news_type") as NewsPost["type"]) ?? "update",
    title: getTagValue(event, "title") ?? "Untitled",
    body: event.content,
    author: getTagValue(event, "p") ?? "anonymous",
    authorNpub: hexToNpub(event.pubkey),
    createdAt: event.created_at,
    updatedAt: event.created_at,
  };
}

function deriveNostrKey(systemSecret: Uint8Array, accountId: string): Uint8Array {
  return hmac(sha256, systemSecret, accountId);
}

export class NostrCommentService extends Context.Tag("nostr-comments/NostrCommentService")<
  NostrCommentService,
  {
    listComments: (
      projectId: string,
      limit: number,
      until?: number,
    ) => Effect.Effect<CommentListResult, ORPCError<string, unknown>>;

    publishComment: (
      projectId: string,
      accountId: string,
      content: string,
      replyTo?: string,
    ) => Effect.Effect<Comment, ORPCError<string, unknown>>;

    publishSignedComment: (
      projectId: string,
      event: NostrEvent,
    ) => Effect.Effect<Comment, ORPCError<string, unknown>>;

    listNews: (
      projectId: string,
      limit: number,
      type?: NewsPost["type"],
    ) => Effect.Effect<{ data: NewsPost[] }, ORPCError<string, unknown>>;

    publishNews: (
      projectId: string,
      accountId: string,
      content: string,
      title: string,
      newsType: NewsPost["type"],
    ) => Effect.Effect<NewsPost, ORPCError<string, unknown>>;

    ping: () => Effect.Effect<{ relay: string }, ORPCError<string, unknown>>;
  }
>() {}

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"];

const DEFAULT_FALLBACK = ["wss://relay.snort.social"];

export const NostrCommentServiceLive = (config?: {
  variables?: { relays?: string; fallbackRelays?: string };
  systemSecret?: string;
}) =>
  Layer.effect(
    NostrCommentService,
    Effect.gen(function* () {
      const configuredRelays =
        config?.variables?.relays
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? DEFAULT_RELAYS;
      const configuredFallback =
        config?.variables?.fallbackRelays
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? DEFAULT_FALLBACK;
      const allRelays = [...configuredRelays, ...configuredFallback];
      const pool = new SimplePool();

      let systemKey: Uint8Array;
      if (config?.systemSecret) {
        systemKey = hexToBytes(config.systemSecret);
      } else {
        systemKey = generateSecretKey();
        console.log("[NostrComments] No NOSTR_SYSTEM_SECRET - generated ephemeral system key");
      }

      const publishToRelays = (event: NostrEvent) =>
        Effect.promise(async () => {
          await Promise.any(
            allRelays.map(async (url) => {
              try {
                const relay = await Relay.connect(url);
                await relay.publish(event);
                relay.close();
              } catch {
                // best-effort
              }
            }),
          );
        });

      return NostrCommentService.of({
        listComments: (projectId, limit, until) =>
          Effect.gen(function* () {
            const events = yield* Effect.tryPromise({
              try: async () => {
                return pool.querySync(
                  allRelays,
                  {
                    kinds: [1],
                    "#t": ["nbs"],
                    "#project": [projectId],
                    limit,
                    ...(until ? { until } : {}),
                  },
                  { maxWait: 3000 },
                );
              },
              catch: (error) =>
                new ORPCError("INTERNAL_SERVER_ERROR", {
                  message: `Relay query failed: ${error instanceof Error ? error.message : String(error)}`,
                }),
            });

            const data = events.sort((a, b) => b.created_at - a.created_at).map(eventToComment);

            return {
              data,
              meta: {
                total: data.length,
                hasMore: data.length === limit,
                oldestCreatedAt: data.length > 0 ? data[data.length - 1].createdAt : null,
              },
            };
          }),

        publishComment: (projectId, accountId, content, replyTo) =>
          Effect.gen(function* () {
            if (!content.trim()) {
              yield* Effect.fail(
                new ORPCError("BAD_REQUEST", { message: "Comment content is required" }),
              );
            }

            const key = deriveNostrKey(systemKey, accountId);
            const template = {
              kind: 1 as const,
              created_at: Math.floor(Date.now() / 1000),
              tags: [
                ["t", "nbs"],
                ["p", accountId],
                ["project", projectId],
                ...(replyTo ? [["e", replyTo, "", "reply"] as string[]] : []),
              ],
              content,
            };
            const event = finalizeEvent(template, key);

            yield* publishToRelays(event).pipe(Effect.catchAll(() => Effect.void));

            return eventToComment(event);
          }),

        publishSignedComment: (projectId, signedEvent) =>
          Effect.gen(function* () {
            if (!verifyEvent(signedEvent)) {
              yield* Effect.fail(
                new ORPCError("BAD_REQUEST", { message: "Invalid Nostr event signature" }),
              );
            }

            const hasProject = signedEvent.tags.some(
              (t) => t[0] === "project" && t[1] === projectId,
            );
            if (!hasProject) {
              yield* Effect.fail(
                new ORPCError("BAD_REQUEST", {
                  message: "Event missing required project tag",
                }),
              );
            }

            yield* publishToRelays(signedEvent).pipe(Effect.catchAll(() => Effect.void));

            return eventToComment(signedEvent);
          }),

        listNews: (projectId, limit, type) =>
          Effect.gen(function* () {
            const events = yield* Effect.tryPromise({
              try: async () => {
                return pool.querySync(
                  allRelays,
                  {
                    kinds: [30078],
                    "#t": ["nbs-news"],
                    "#project": [projectId],
                    limit,
                    ...(type ? { "#news_type": [type] } : {}),
                  },
                  { maxWait: 3000 },
                );
              },
              catch: () =>
                new ORPCError("INTERNAL_SERVER_ERROR", { message: "Relay query failed" }),
            }).pipe(Effect.catchAll(() => Effect.sync(() => [] as NostrEvent[])));

            const data = events.sort((a, b) => b.created_at - a.created_at).map(eventToNewsPost);

            return { data };
          }),

        publishNews: (projectId, accountId, content, title, newsType) =>
          Effect.gen(function* () {
            const key = deriveNostrKey(systemKey, accountId);
            const template = {
              kind: 30078 as const,
              created_at: Math.floor(Date.now() / 1000),
              tags: [
                ["d", `${projectId}-${newsType}-${Date.now()}`],
                ["t", "nbs-news"],
                ["project", projectId],
                ["news_type", newsType],
                ["title", title],
                ["p", accountId],
              ],
              content,
            };
            const event = finalizeEvent(template, key);

            yield* publishToRelays(event).pipe(Effect.catchAll(() => Effect.void));

            return eventToNewsPost(event);
          }),

        ping: () =>
          Effect.gen(function* () {
            const reachable: string[] = [];
            for (const url of allRelays) {
              const ok = yield* Effect.tryPromise({
                try: async () => {
                  const relay = await Relay.connect(url);
                  relay.close();
                  return true as const;
                },
                catch: () => false as const,
              }).pipe(Effect.catchAll(() => Effect.sync(() => false)));
              if (ok) reachable.push(url);
            }

            if (reachable.length === 0) {
              yield* Effect.fail(
                new ORPCError("SERVICE_UNAVAILABLE", { message: "No relays reachable" }),
              );
            }

            return { relay: reachable.join(", ") };
          }),
      });
    }),
  );
