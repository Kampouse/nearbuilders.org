import type { ClientRuntimeConfig } from "@/app";

export function getSiteUrl(
  runtimeConfig: Partial<ClientRuntimeConfig> | undefined,
  path: string,
): string | undefined {
  if (!runtimeConfig?.hostUrl) return undefined;
  const runtimeBasePath = runtimeConfig.runtime?.runtimeBasePath ?? "/";
  const base = `${runtimeConfig.hostUrl}${runtimeBasePath === "/" ? "" : runtimeBasePath}`;
  return `${base}${path}`;
}
