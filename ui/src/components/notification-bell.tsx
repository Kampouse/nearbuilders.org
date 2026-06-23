import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { useApiClient } from "@/app";
import { NotificationSourceIcon } from "@/components/notification-source-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkNotificationRead, useNotificationStream, useOpenNotification } from "@/hooks";
import {
  formatRelativeTime,
  notificationsQueryOptions,
  notificationTypeLabel,
  unreadNotificationsQueryOptions,
} from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const apiClient = useApiClient();
  const openNotification = useOpenNotification();
  const markAsRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  useNotificationStream();

  const recentQuery = useQuery(notificationsQueryOptions(apiClient, { limit: 5 }));
  const unreadQuery = useQuery(unreadNotificationsQueryOptions(apiClient));
  const unreadCount = unreadQuery.data?.meta.total ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative size-9 rounded-full"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          title="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentQuery.isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : recentQuery.isError ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Couldn’t load notifications
          </div>
        ) : recentQuery.data?.data.length ? (
          recentQuery.data.data.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="cursor-pointer items-start gap-3 py-3"
              onSelect={() => {
                setOpen(false);
                void openNotification(notification);
              }}
            >
              <span className="mt-0.5 text-muted-foreground">
                <NotificationSourceIcon source={notification.source} />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span
                  className={cn(
                    "block truncate text-sm",
                    notification.read ? "font-normal" : "font-semibold",
                  )}
                >
                  {notification.subject}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{notificationTypeLabel(notification.type)}</span>
                  <span>{formatRelativeTime(notification.createdAt)}</span>
                </span>
              </span>
              {!notification.read && (
                <button
                  type="button"
                  aria-label="Mark as read"
                  title="Mark as read"
                  className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    markAsRead.mutate(notification.id);
                  }}
                >
                  <Check className="size-4" />
                </button>
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer justify-center text-sm font-medium">
          <Link to="/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
