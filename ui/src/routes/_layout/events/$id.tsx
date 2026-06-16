import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/events/$id")({
  head: () => ({
    meta: [{ title: "Event | NEAR Builders" }, { name: "description", content: "Event details." }],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { id } = Route.useParams();
  const apiClient = useApiClient();
  const auth = useAuthClient();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const { data: session } = useQuery(sessionQueryOptions(auth, undefined));
  const nearAccountId = auth.near.getAccountId();

  const eventQuery = useQuery({
    queryKey: ["event", id],
    queryFn: () => apiClient.getEvent({ id }),
  });

  const event = eventQuery.data?.data;
  const canManage =
    event &&
    (session?.user?.role === "admin" ||
      [nearAccountId, session?.user?.id].some((candidate) => candidate === event.ownerId));

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteEvent({ id }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      void navigate({ to: "/events" });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete"),
  });

  const handleShare = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (eventQuery.isLoading) {
    return (
      <div className="flex flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
          <div className="h-5 w-30 animate-pulse rounded bg-secondary" />
        </div>
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
          <div className="h-9 w-2/3 animate-pulse rounded-md bg-secondary" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-secondary" />
          <div className="mt-6 h-24 w-full animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>
    );
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center gap-4 p-6">
        <p className="text-base font-semibold text-foreground">Event not found.</p>
        <Link to="/events" className="text-sm font-bold text-brand-accent hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  const isCancelled = event.status === "cancelled";

  return (
    <div className="flex flex-col">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to events">
            <Link to="/events">
              <ArrowLeft size={15} />
            </Link>
          </Button>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="hidden max-w-[160px] truncate text-sm font-semibold text-foreground sm:block">
            {event.slug}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={handleShare}
            title="Copy link"
            className={copied ? "text-brand-accent" : ""}
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
          </Button>
          {canManage && (
            <Button asChild size="sm" variant="outline">
              <Link to="/events/$id/edit" params={{ id }}>
                <Pencil size={13} />
                <span className="hidden sm:inline">Edit</span>
              </Link>
            </Button>
          )}
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this event permanently?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {event.visibility === "private" && <Lock size={11} />}
            {event.visibility}
          </Badge>
          {isCancelled && <Badge variant="destructive">Cancelled</Badge>}
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
            {event.title}
          </h1>
          {event.lumaUrl && (
            <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
              <a href={event.lumaUrl} target="_blank" rel="noopener noreferrer">
                {isCancelled ? "View on Luma" : "Register on Luma"}
                <ExternalLink size={13} />
              </a>
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Fact icon={<CalendarDays size={14} />} text={formatEventDate(event)} />
          <Fact icon={<Clock size={14} />} text={formatEventTime(event)} />
          {event.location && <Fact icon={<MapPin size={14} />} text={event.location} />}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Hosted by <span className="font-medium text-foreground">{shortenId(event.ownerId)}</span>
        </p>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-bold text-foreground">About this event</h2>
          <div className="mt-3">
            {event.content ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {event.content}
              </p>
            ) : event.description ? (
              <p className="text-sm leading-relaxed text-foreground">{event.description}</p>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No additional details yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {text}
    </span>
  );
}

function shortenId(id: string): string {
  // Named accounts (e.g. itexpert120.near) are shown in full; only implicit
  // 64-char hex accounts get truncated since they're not human-readable.
  if (/^[0-9a-f]{64}$/i.test(id)) return `${id.slice(0, 6)}...${id.slice(-4)}`;
  return id;
}

function formatEventDate(event: { startAt: string }) {
  return new Date(event.startAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(event: { startAt: string; endAt: string | null }) {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return startLabel;
  return `${startLabel} - ${end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
