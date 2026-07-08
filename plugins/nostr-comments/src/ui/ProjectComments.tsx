import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  projectId: string;
  author: string;
  authorNpub: string;
  content: string;
  createdAt: number;
  replyTo: string | null;
  reactions: number;
}

interface ListCommentsResponse {
  data: Comment[];
  meta: { total: number; hasMore: boolean; oldestCreatedAt: number | null };
}

// ── Comment Section Component ────────────────────────────────────────────────

interface ProjectCommentsProps {
  projectId: string;
}

export function ProjectComments({ projectId }: ProjectCommentsProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["nostr-comments", projectId],
    queryFn: async (): Promise<ListCommentsResponse> => {
      const res = await fetch(
        `/api/v1/projects/${projectId}/comments?limit=50`,
      );
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
  });

  const { mutate: publishComment, isPending } = useMutation({
    mutationFn: async (params: { content: string; replyTo?: string }) => {
      // Client signs the Nostr event (requires connection.ts)
      const event = await signCommentEvent(projectId, params.content, params.replyTo);
      const res = await fetch(`/api/v1/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId, event }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nostr-comments", projectId] });
      setInput("");
      setReplyTo(null);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    publishComment({ content: input.trim(), replyTo: replyTo ?? undefined });
  }, [input, replyTo, publishComment]);

  // Group comments: top-level + replies
  const topLevel = data?.data.filter((c) => !c.replyTo) ?? [];
  const repliesByParent = (data?.data ?? []).reduce<Record<string, Comment[]>>(
    (acc, c) => {
      if (c.replyTo) {
        (acc[c.replyTo] ??= []).push(c);
      }
      return acc;
    },
    {},
  );

  return (
    <div className="border-t border-border px-6 pb-8 pt-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {data?.meta.total ?? 0} comments
          </span>{" "}
          · via Nostr
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand-accent" />
          relay.nearbuilders.org
        </div>
      </div>

      {/* Comment form */}
      <div className="mb-6">
        <textarea
          placeholder={replyTo ? "Write a reply…" : "Add your thoughts…"}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-accent focus:ring-1 focus:ring-brand-accent resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Posted to Nostr · readable on Damus, Amethyst & any Nostr client
          </p>
          <button
            type="button"
            disabled={!input.trim() || isPending}
            onClick={handleSubmit}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold cursor-pointer transition-colors duration-150 outline-none bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl px-4 py-1.5"
          >
            {isPending ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <div>
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={() => {
                  setReplyTo(comment.id);
                }}
              />
              {/* Nested replies */}
              {(repliesByParent[comment.id] ?? []).map((reply) => (
                <div
                  key={reply.id}
                  className="ml-4 border-l-2 border-border px-4 py-3.5"
                >
                  <CommentItem
                    comment={reply}
                    onReply={() => setReplyTo(reply.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single Comment ───────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
}

function CommentItem({ comment, onReply }: CommentItemProps) {
  const isVerified = comment.author.endsWith(".near");

  return (
    <div className="px-4 py-3.5 border-b border-muted last:border-b-0">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">
          {comment.author}
          {isVerified && (
            <span className="text-brand-accent ml-0.5">✓</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTimeAgo(comment.createdAt)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-secondary-foreground">
        {comment.content}
      </p>
      <div className="mt-1.5 flex gap-4">
        <button className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          ❤ {comment.reactions > 0 ? comment.reactions : ""}
        </button>
        <button
          onClick={onReply}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

// ── Utils ────────────────────────────────────────────────────────────────────

function formatTimeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Nostr signing (imported from connection.ts) ──────────────────────────────
// This is a thin wrapper — the actual key management lives in connection.ts

async function signCommentEvent(
  projectId: string,
  content: string,
  replyTo?: string,
): Promise<{
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}> {
  // Import dynamically to avoid bundling Nostr libs on every page
  const { finalizeEvent } = await import("nostr-tools/pure");
  const { getOrCreateEphemeralKey, connectNostr } = await import("./connection");

  // Get or create a Nostr connection
  let connection;
  try {
    connection = await connectNostr("extension");
  } catch {
    connection = await connectNostr("ephemeral");
  }

  const template = {
    kind: 1 as const,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["t", "nbs"],
      ["p", connection.nearAccount ?? "anonymous"],
      ["project", projectId],
      ...(replyTo ? [["e", replyTo, "", "reply"] as string[]] : []),
    ],
    content,
  };

  return connection.sign(template);
}
