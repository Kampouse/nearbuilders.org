import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { type Passkey, type SessionData, sessionQueryOptions, useAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_layout/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Workspace | app" },
      { name: "description", content: "Your workspace center." },
    ],
  }),
  component: Home,
});

function Home() {
  const auth = useAuthClient();
  const { data: session } = useQuery<SessionData | null>(sessionQueryOptions(auth, undefined));
  const { data: passkeys = [] } = useQuery({
    queryKey: ["passkeys"],
    queryFn: async () => {
      const { data } = await auth.passkey.listUserPasskeys();
      return (data || []) as Passkey[];
    },
    staleTime: 60 * 1000,
  });
  const user = session?.user;
  const nearAccountId = auth.near.getAccountId();

  const profile = useMemo(() => {
    if (!user)
      return {
        isAnonymous: false,
        hasEmail: false,
        hasNear: false,
        hasPasskeys: false,
        isAdmin: false,
      };
    return {
      isAnonymous: user.isAnonymous || false,
      hasEmail: Boolean(user.email),
      hasNear: Boolean(nearAccountId),
      hasPasskeys: passkeys.length > 0,
      isAdmin: user.role === "admin",
    };
  }, [user, nearAccountId, passkeys.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold text-foreground">Workspace</h1>
        <Button asChild size="sm">
          <Link to="/settings">Settings</Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {!user ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Chip>workspace</Chip>
                    {profile.isAnonymous && <Chip>anonymous</Chip>}
                    {profile.isAdmin && <Chip accent>admin</Chip>}
                  </div>
                  <CardTitle className="text-xl">
                    {user.name || user.email || user.id.slice(0, 8)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage your identity and connected accounts.
                  </p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Identity Status
                  </p>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <InfoRow
                    label="Email"
                    value={profile.hasEmail ? (user.email ?? "linked") : "not linked"}
                  />
                  <InfoRow
                    label="NEAR"
                    value={profile.hasNear ? (nearAccountId ?? "linked") : "not linked"}
                    mono
                  />
                  <InfoRow
                    label="Passkeys"
                    value={profile.hasPasskeys ? `${passkeys.length} registered` : "not linked"}
                  />
                  <InfoRow
                    label="Profile"
                    value={profile.isAnonymous ? "anonymous session" : "persistent account"}
                  />

                  {profile.isAnonymous && (
                    <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground leading-relaxed px-4 py-3">
                      Link an email or NEAR wallet before signing out to keep your data.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 rounded-md border border-border bg-muted px-3 py-2.5 items-center">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
        accent
          ? "bg-primary/10 border-primary/20 text-primary"
          : "bg-secondary border-border text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}
