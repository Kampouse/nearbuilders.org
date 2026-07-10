import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, MessageCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getNostrNpub, hasNIP07, signNostrEvent } from "@/lib/nostr";

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

type SigningMethod = "near" | "nostr";
const METHOD_KEY = "nbs:nostr-method";

export function ProjectComments({ projectId }: { projectId: string }) {
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [signingMethod, setSigningMethod] = useState<SigningMethod>("near");
  const [nostrNpub, setNostrNpub] = useState<string | null>(null);
  const [nip07Available, setNip07Available] = useState(false);

  const { data: session } = useQuery(sessionQueryOptions(auth, undefined));
  const isAuthenticated = Boolean(session?.user && !session.user.isAnonymous);

  useEffect(() => {
    setNip07Available(hasNIP07());
    const saved = localStorage.getItem(METHOD_KEY) as SigningMethod | null;
    if (saved && (saved === "near" || (saved === "nostr" && hasNIP07()))) {
      setSigningMethod(saved);
    }
  }, []);

  useEffect(() => {
    if (signingMethod === "nostr" && !nostrNpub) {
      getNostrNpub()
        .then(setNostrNpub)
        .catch(() => {
          setSigningMethod("near");
          localStorage.setItem(METHOD_KEY, "near");
        });
    }
  }, [signingMethod, nostrNpub]);

  const { data, isLoading } = useQuery({
    queryKey: ["nostr-comments", projectId],
    queryFn: async (): Promise<ListCommentsResponse> => {
      return apiClient["nostr-comments"].listComments({ projectId, limit: 50 });
    },
  });

  const { mutate: publishComment, isPending } = useMutation({
    mutationFn: async (params: { content: string; replyTo?: string }) => {
      if (signingMethod === "nostr" && hasNIP07()) {
        const template = {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["t", "nbs"],
            ["project", projectId],
            ...(params.replyTo ? [["e", params.replyTo, "", "reply"] as string[]] : []),
          ],
          content: params.content,
        };
        const event = await signNostrEvent(template);
        return apiClient["nostr-comments"].createComment({ projectId, event });
      }
      return apiClient["nostr-comments"].createComment({
        projectId,
        content: params.content,
        replyTo: params.replyTo,
      });
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

  function switchMethod(method: SigningMethod) {
    setSigningMethod(method);
    localStorage.setItem(METHOD_KEY, method);
  }

  const topLevel = data?.data.filter((c) => !c.replyTo) ?? [];
  const repliesByParent = (data?.data ?? []).reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.replyTo) {
      const arr = acc[c.replyTo] ?? [];
      arr.push(c);
      acc[c.replyTo] = arr;
    }
    return acc;
  }, {});

  return (
    <div className="border-t border-border pt-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle size={16} className="text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          {data?.meta.total ?? 0} comments
        </span>
        <span className="text-xs text-muted-foreground">via Nostr</span>
      </div>

      {isAuthenticated ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchMethod("near")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                signingMethod === "near"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap size={12} />
              NEAR account
            </button>
            {nip07Available && (
              <button
                type="button"
                onClick={() => switchMethod("nostr")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  signingMethod === "nostr"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound size={12} />
                {nostrNpub ? `${nostrNpub.slice(0, 12)}...` : "Nostr ext"}
              </button>
            )}
          </div>

          <div className="mb-6">
            <Textarea
              placeholder={replyTo ? "Write a reply..." : "Add your thoughts..."}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="resize-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {signingMethod === "nostr"
                  ? "Signed with your Nostr key"
                  : "Signed via NEAR account"}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!input.trim() || isPending}
                onClick={handleSubmit}
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Comment"
                )}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in with your NEAR account to leave a comment.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <div>
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem comment={comment} onReply={() => setReplyTo(comment.id)} />
              {(repliesByParent[comment.id] ?? []).map((reply) => (
                <div key={reply.id} className="ml-4 border-l-2 border-border px-4 py-3.5">
                  <CommentItem comment={reply} onReply={() => setReplyTo(reply.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  const isVerified = comment.author.endsWith(".near") || comment.author.endsWith(".testnet");

  return (
    <div className="border-muted border-b px-4 py-3.5 last:border-b-0">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">
          {comment.author}
          {isVerified && <span className="text-brand-accent ml-0.5">verified</span>}
        </span>
        <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
      </div>
      <p className="text-secondary-foreground text-sm leading-relaxed">{comment.content}</p>
      <div className="mt-1.5 flex gap-4">
        <button
          type="button"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {comment.reactions > 0 ? comment.reactions : ""}
        </button>
        <button
          type="button"
          onClick={onReply}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
