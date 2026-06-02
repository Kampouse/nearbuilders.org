import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Profile } from "better-near-auth";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { useApiClient, useAuthClient } from "@/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_layout/builders/$account")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.account} | NEAR Builders` },
      {
        name: "description",
        content: `Builder profile for ${params.account} on NEAR Builders.`,
      },
    ],
  }),
  component: BuilderProfilePage,
  notFoundComponent: BuilderNotFound,
});

type BuilderData = NonNullable<
  Awaited<ReturnType<ReturnType<typeof useApiClient>["builders"]["getBuilder"]>>["data"]
>;

function BuilderProfilePage() {
  const { account } = Route.useParams();
  const apiClient = useApiClient();

  const { data: builderResult, isLoading } = useQuery({
    queryKey: ["builder", account],
    queryFn: () => apiClient.builders.getBuilder({ nearAccount: account }),
    retry: false,
  });

  if (isLoading) return <ProfileSkeleton account={account} />;
  if (!builderResult?.data) return <BuilderNotFound />;

  return <LoadedProfile account={account} builder={builderResult.data} />;
}

function LoadedProfile({ account, builder }: { account: string; builder: BuilderData }) {
  const auth = useAuthClient();
  const apiClient = useApiClient();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ["near-profile", account],
    queryFn: async () => {
      const res = await auth.near.getProfile(account);
      return res.data || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectsResult, isLoading: projectsLoading } = useQuery({
    queryKey: ["builder-projects", account],
    queryFn: () =>
      apiClient.projects.listProjects({
        ownerId: account,
        visibility: "public",
        limit: 6,
      }),
  });

  const projects = projectsResult?.data ?? [];

  const displayName = builder.name || profile?.name || account;
  const bio = builder.bio || profile?.description || null;

  const avatarUrl =
    profile?.image?.url ??
    (profile?.image?.ipfs_cid ? `https://ipfs.near.social/ipfs/${profile.image.ipfs_cid}` : null);

  const backgroundUrl =
    profile?.backgroundImage?.url ??
    (profile?.backgroundImage?.ipfs_cid
      ? `https://ipfs.near.social/ipfs/${profile.backgroundImage.ipfs_cid}`
      : null);

  const allLinks: Record<string, string> = {};
  if (profile?.linktree) {
    for (const [k, v] of Object.entries(profile.linktree)) {
      if (typeof v === "string") allLinks[k] = v;
    }
  }
  for (const [k, v] of Object.entries(builder.links ?? {})) {
    allLinks[k] = v;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <Link
          to="/builders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          All builders
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
        <div className="relative h-40 sm:h-48">
          <div
            className="absolute inset-0"
            style={{
              background: backgroundUrl
                ? undefined
                : "radial-gradient(ellipse at top left, color-mix(in srgb, var(--brand-green) 25%, transparent), color-mix(in srgb, var(--brand-cyan) 15%, transparent))",
            }}
          />
          {backgroundUrl && (
            <img
              src={backgroundUrl}
              alt="Profile background"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="absolute -bottom-10 left-6 sm:left-8">
            <div className="size-20 rounded-full overflow-hidden bg-muted border-4 border-card flex items-center justify-center shadow-lg">
              {profileLoading ? (
                <Skeleton className="size-20 rounded-full" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-20 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="text-2xl font-black text-muted-foreground">
                  {getInitials(displayName)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 sm:px-8 pb-8">
          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-foreground leading-tight">{displayName}</h1>
                <p className="text-sm font-mono text-brand-cyan mt-1">{account}</p>
                {builder.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
                    <MapPin size={13} />
                    {builder.location}
                  </div>
                )}
              </div>
              {Object.keys(allLinks).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(allLinks).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-secondary border border-border hover:bg-muted hover:border-border/80 transition-all duration-150 font-medium"
                    >
                      {platform}
                      <ExternalLink size={10} className="opacity-40" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {bio && (
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-2xl">{bio}</p>
          )}

          {builder.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {builder.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs px-3 py-1 rounded-full font-medium"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-foreground">Projects</h2>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-secondary h-20 rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No public projects yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$id"
                params={{ id: project.id }}
                className="group bg-card border border-border rounded-xl px-5 py-4 hover:border-border/80 hover:shadow-md transition-all duration-150 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate flex-1 group-hover:text-brand-cyan transition-colors">
                    {project.title}
                  </span>
                  <span className="text-[10px] font-semibold border border-border rounded-[4px] px-1.5 py-0.5 text-muted-foreground shrink-0">
                    {project.kind}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}

        {(projectsResult?.meta.hasMore ?? false) && (
          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link
                to="/projects"
                search={{ kind: "all", personal: undefined, private: undefined }}
              >
                View all projects
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileSkeleton({ account }: { account: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <Link
          to="/builders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          All builders
        </Link>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
        <Skeleton className="h-40 sm:h-48 w-full rounded-none" />
        <div className="pt-14 px-6 sm:px-8 pb-8 space-y-3">
          <Skeleton className="h-8 w-48" />
          <p className="text-sm font-mono text-brand-cyan">{account}</p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

function BuilderNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-5xl mb-6">🔍</div>
        <h1 className="text-2xl font-black text-foreground mb-2">Builder not found</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
          This builder profile doesn't exist or hasn't been approved yet.
        </p>
        <Button asChild className="rounded-full px-6">
          <Link to="/builders">Browse builders</Link>
        </Button>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
