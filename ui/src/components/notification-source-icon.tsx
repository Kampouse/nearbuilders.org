import { Bell, Calendar, FolderKanban, UserRound } from "lucide-react";

const ICONS = {
  projects: FolderKanban,
  events: Calendar,
  builders: UserRound,
} as const;

export function NotificationSourceIcon({ source }: { source: string }) {
  const Icon = ICONS[source as keyof typeof ICONS] ?? Bell;
  return <Icon className="size-4" />;
}
