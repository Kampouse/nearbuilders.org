import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/projects/new/")({
  loader: () => {
    throw redirect({
      to: "/projects/new/$kind",
      params: { kind: "idea" },
      search: { tab: "write" },
    });
  },
});
