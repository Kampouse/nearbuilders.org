import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { sessionQueryOptions } from "@/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import builtOn from "@/assets/built_on.png";
import builtOnRev from "@/assets/built_on_rev.png";

export const Route = createFileRoute("/_layout")({
  beforeLoad: async ({ context }) => {
    const { queryClient, authClient } = context;
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(authClient, context.session),
    );
    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      session,
    };
  },
  component: Layout,
});

const navLinks = [
  { label: "Builders", to: "/builders" },
  { label: "Projects", to: "/projects" },
] as const;

function Layout() {
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });
  const appName = "NearBuilders";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden">
          <div className="h-full bg-brand-green animate-progress-bar" />
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 font-black text-lg tracking-tight text-foreground hover:opacity-80 transition-opacity"
            >
              <span className="text-brand-green">●</span>
              {appName}
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-semibold"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <UserNav />
            </div>

            <button
              type="button"
              className="md:hidden flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background animate-fade-in">
            <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors [&.active]:text-foreground [&.active]:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <ThemeToggle />
                <UserNav />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 animate-fade-in-up">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-brand-green font-bold">●</span>
              <span className="font-semibold text-foreground">{appName}</span>
              <span>— open platform for builders on NEAR</span>
            </div>
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <a
                href="https://near.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="relative h-5 w-[84px] shrink-0"
              >
                <img
                  src={builtOn}
                  alt="Built on NEAR"
                  className="absolute inset-0 h-full w-full object-contain dark:hidden"
                />
                <img
                  src={builtOnRev}
                  alt="Built on NEAR"
                  className="absolute inset-0 hidden h-full w-full object-contain dark:block"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
