import { createFileRoute, redirect } from "@tanstack/react-router";
import { isProjectKind } from "./-search";

export const Route = createFileRoute("/_layout/projects/$kind/$id_/edit")({
  validateSearch: (search) => search as Record<string, unknown>,
  loader: async ({ params, context }) => {
    const project = await context.apiClient
      .getProject({ id: params.id })
      .then((response) => response.data)
      .catch(() => null);

    if (project?.slug) {
      throw redirect({
        to: "/projects/$slug/edit",
        params: { slug: project.slug },
        search: { tab: "write" },
        replace: true,
      });
    }

    throw redirect({
      to: "/projects",
      search: isProjectKind(params.kind) ? { kind: params.kind } : {},
      replace: true,
    });
  },
});
