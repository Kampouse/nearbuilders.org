import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/_authenticated/_dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <div
      className={
        isSettingsRoute ? "flex min-h-full flex-col" : "flex h-dvh flex-col overflow-hidden"
      }
    >
      <Outlet />
    </div>
  );
}
