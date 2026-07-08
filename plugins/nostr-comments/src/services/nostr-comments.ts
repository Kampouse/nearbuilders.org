import { and, count, desc, eq, or, isNull } from "drizzle-orm";
import { Context, Effect, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { verifyEvent, type NostrEvent } from "nostr-tools/pure";
import { Relay, useWebSocketImplementation } from "nostr-tools/relay";
import { SimplePool } from "nostr-tools/pool";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
import { DatabaseTag } from "./db/layer";
import { attestations, comments, newsPosts } from "./db/schema";

useWebSocketImplementation(globalThis.WebSocket);

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface AttestationRecord {
  id: string;
  accountId: string;
  nostrPubkey: string;
  npub: string;
  verified: boolean;
  createdAt: string;
}

// ── Utils ────────────────────────────────────────────────────────────────────

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

// ── Service Interface ────────────────────────────────────────────────────────

export class NostrCommentService extends Context.Tag("nostr-comments/NostrCommentService")<
  NostrCommentService,
  {
    listComments: (
      projectId: string,
      limit: number,
      until?: number,
    ) => Effect.Effect<{ data: Comment[]; hasMore: boolean; oldest: number | null }, ORPCError<string, unknown>>;

    publishComment: (
      projectId: string,
      event: NostrEvent,
    ) => Effect.Effect<Comment, ORPCError<string, unknown>>;

    listNews: (
      projectId: string,
      type?: NewsPost["type"],
      limit: number,
    ) => Effect.Effect<{ data: NewsPost[] }, ORPCError<string, unknown>>;

    publishNews: (
      projectId: string,
      event: NostrEvent,
    ) => Effect.Effect<NewsPost, ORPCError<string, unknown>>;

    saveAttestation: (
      attestation: {
        accountId: string;
        nostrPubkey: string;
        publicKey: string;
        signature: string;
        nonce: string;
        recipient: string;
        message: string;
      },
    ) => Effect.Effect<AttestationRecord, ORPCError<string, unknown>>;

    getAttestation: (
      accountId: string,
    ) => Effect.Effect<AttestationRecord | null, ORPCError<string, unknown>>;

    ping: () => Effect.Effect<{ relay: string }, ORPCError<string, unknown>>;
  }
>() {}

// ── Live Implementation ─────────────────────────────────────────────────────

const DEFAULT_RELAYS: string[] = [];

const DEFAULT_FALLBACK: string[] = [];

export const NostrCommentServiceLive = (config?: {
  variables?: { relays?: string; fallbackRelays?: string };
}) => Layer.effect(
  NostrCommentService,
  Effect.gen(function* () {
    const db = yield* DatabaseTag;
    const configuredRelays = (config?.variables?.relays?.split(",").map((s: string) => s.trim()).filter(Boolean)) ?? DEFAULT_RELAYS;
  const configuredFallback = (config?.variables?.fallbackRelays?.split(",").map((s: string) => s.trim()).filter(Boolean)) ?? DEFAULT_FALLBACK;
  const allRelays = [...configuredRelays, ...configuredFallback];
    const pool = new SimplePool();

    const publishToRelays = (event: NostrEvent) =>
      Effect.promise(async () => {
        for (const url of allRelays) {
          try {
            const relay = await Relay.connect(url);
            await relay.publish(event);
            relay.close();
          } catch {
            // best-effort
          }
        }
      });

    const cacheComment = (comment: Comment) =>
      Effect.promise(async () => {
        await db.insert(comments).values({
          id: comment.id,
          projectId: comment.projectId,
          pubkey: comment.authorNpub,
          npub: comment.authorNpub,
          author: comment.author,
          content: comment.content,
          replyTo: comment.replyTo,
          createdAt: new Date(comment.createdAt * 1000),
        }).onConflictDoNothing();
      });

    const cacheNewsPost = (post: NewsPost) =>
      Effect.promise(async () => {
        await db.insert(newsPosts).values({
          id: post.id,
          projectId: post.projectId,
          pubkey: post.authorNpub,
          npub: post.authorNpub,
          author: post.author,
          type: post.type,
          title: post.title,
          body: post.body,
          createdAt: new Date(post.createdAt * 1000),
          updatedAt: new Date(post.updatedAt * 1000),
        }).onConflictDoNothing();
      });

    return NostrCommentService.of({
      // ── listComments ───────────────────────────────────────────────────
      listComments: (projectId, limit, until) =>
        Effect.gen(function* () {
          // Try DB cache first
          const cached = yield* Effect.promise(() =>
            db.select().from(comments)
              .where(eq(comments.projectId, projectId))
              .orderBy(desc(comments.createdAt))
              .limit(limit)
              .execute(),
          );

          if (cached.length > 0) {
            const data: Comment[] = cached.map((c) => ({
              id: c.id,
              projectId: c.projectId,
              author: c.author,
              authorNpub: c.npub,
              content: c.content,
              createdAt: Math.floor(c.createdAt.getTime() / 1000),
              replyTo: c.replyTo,
              reactions: 0,
            }));
            const oldest = data.length > 0 ? data[data.length - 1].createdAt : null;
            return { data, hasMore: data.length === limit, oldest };
          }

          // Fallback: query relays
          const events = yield* Effect.tryPromise({
            try: async () => {
              const filter = {
                kinds: [1],
                "#t": ["nbs"],
                "#project": [projectId],
                limit,
                ...(until ? { until } : {}),
              };
              return pool.querySync(allRelays, filter, { maxWait: 3000 });
            },
            catch: (error) =>
              new ORPCError("INTERNAL_SERVER_ERROR", {
                message: `Relay query failed: ${error instanceof Error ? error.message : String(error)}`,
              }),
          });

          const data = events
            .sort((a, b) => b.created_at - a.created_at)
            .map(eventToComment);

          // Cache results
          for (const c of data) {
            yield* cacheComment(c).pipe(Effect.catchAll(() => Effect.void));
          }

          const oldest = data.length > 0 ? data[data.length - 1].createdAt : null;
          return { data, hasMore: data.length === limit, oldest };
        }),

      // ── publishComment ─────────────────────────────────────────────────
      publishComment: (projectId, event) =>
        Effect.gen(function* () {
          // Verify signature
          if (!verifyEvent(event)) {
            yield* Effect.fail(new ORPCError("BAD_REQUEST", { message: "Invalid Nostr event signature" }));
          }

          // Verify tags
          const hasProject = event.tags.some((t) => t[0] === "project" && t[1] === projectId);
          const hasTopic = event.tags.some((t) => t[0] === "t" && t[1] === "nbs");
          if (!hasProject || !hasTopic) {
            yield* Effect.fail(new ORPCError("BAD_REQUEST", {
              message: "Event missing required tags (project/nbs)",
            }));
          }

          const comment = eventToComment(event);

          // Publish to relays + cache
          yield* publishToRelays(event).pipe(Effect.catchAll(() => Effect.void));
          yield* cacheComment(comment);

          return comment;
        }),

      // ── listNews ───────────────────────────────────────────────────────
      listNews: (projectId, type, limit) =>
        Effect.gen(function* () {
          const conditions = [eq(newsPosts.projectId, projectId)];
          if (type) conditions.push(eq(newsPosts.type, type));

          const cached = yield* Effect.promise(() =>
            db.select().from(newsPosts)
              .where(and(...conditions))
              .orderBy(desc(newsPosts.createdAt))
              .limit(limit)
              .execute(),
          );

          if (cached.length > 0) {
            return {
              data: cached.map((n) => ({
                id: n.id,
                projectId: n.projectId,
                type: n.type as NewsPost["type"],
                title: n.title,
                body: n.body,
                author: n.author,
                authorNpub: n.npub,
                createdAt: Math.floor(n.createdAt.getTime() / 1000),
                updatedAt: Math.floor(n.updatedAt.getTime() / 1000),
              })),
            };
          }

          // Fallback: query relays
          const events = yield* Effect.tryPromise({
            try: async () => {
              const filter: Record<string, unknown> = {
                kinds: [30078],
                "#t": ["nbs-news"],
                "#project": [projectId],
                limit,
              };
              if (type) filter["#news_type"] = [type];
              return pool.querySync(allRelays, filter, { maxWait: 3000 });
            },
            catch: () => [] as NostrEvent[],
          });

          const data = events
            .sort((a, b) => b.created_at - a.created_at)
            .map(eventToNewsPost);

          for (const n of data) {
            yield* cacheNewsPost(n).pipe(Effect.catchAll(() => Effect.void));
          }

          return { data };
        }),

      // ── publishNews ────────────────────────────────────────────────────
      publishNews: (projectId, event) =>
        Effect.gen(function* () {
          if (!verifyEvent(event)) {
            yield* Effect.fail(new ORPCError("BAD_REQUEST", { message: "Invalid Nostr event signature" }));
          }

          const hasProject = event.tags.some((t) => t[0] === "project" && t[1] === projectId);
          const hasTopic = event.tags.some((t) => t[0] === "t" && t[1] === "nbs-news");
          if (!hasProject || !hasTopic) {
            yield* Effect.fail(new ORPCError("BAD_REQUEST", {
              message: "Event missing required tags (project/nbs-news)",
            }));
          }

          const post = eventToNewsPost(event);
          yield* publishToRelays(event).pipe(Effect.catchAll(() => Effect.void));
          yield* cacheNewsPost(post);

          return post;
        }),

      // ── saveAttestation ────────────────────────────────────────────────
      saveAttestation: (input) =>
        Effect.gen(function* () {
          const npub = hexToNpub(input.nostrPubkey);
          const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          yield* Effect.promise(() =>
            db.insert(attestations).values({
              id,
              accountId: input.accountId,
              nostrPubkey: input.nostrPubkey,
              npub,
              publicKey: input.publicKey,
              signature: input.signature,
              nonce: input.nonce,
              recipient: input.recipient,
              message: input.message,
              verified: true,
            }).onConflictDoNothing(),
          );

          return {
            id,
            accountId: input.accountId,
            nostrPubkey: input.nostrPubkey,
            npub,
            verified: true,
            createdAt: new Date().toISOString(),
          };
        }),

      // ── getAttestation ─────────────────────────────────────────────────
      getAttestation: (accountId) =>
        Effect.gen(function* () {
          const [row] = yield* Effect.promise(() =>
            db.select().from(attestations)
              .where(eq(attestations.accountId, accountId))
              .limit(1)
              .execute(),
          );

          if (!row) return null;

          return {
            id: row.id,
            accountId: row.accountId,
            nostrPubkey: row.nostrPubkey,
            npub: row.npub,
            verified: row.verified,
            createdAt: row.createdAt.toISOString(),
          };
        }),

      // ── ping ───────────────────────────────────────────────────────────
      ping: () =>
        Effect.gen(function* () {
          // Test relay connectivity
          const reachable: string[] = [];
          for (const url of allRelays) {
            const ok = yield* Effect.tryPromise({
              try: async () => {
                const relay = await Relay.connect(url);
                relay.close();
                return true;
              },
              catch: () => false,
            });
            if (ok) reachable.push(url);
          }

          if (reachable.length === 0) {
            yield* Effect.fail(
              new ORPCError("SERVICE_UNAVAILABLE", {
                message: "No relays reachable",
              }),
            );
          }

          return { relay: reachable.join(", ") };
        }),
    });
  }),
);
