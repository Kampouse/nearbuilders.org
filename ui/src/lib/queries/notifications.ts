import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/app";

export type NotificationPage = Awaited<ReturnType<ApiClient["getMyNotifications"]>>;
export type NotificationRecord = NotificationPage["data"][number];

const PAGE_SIZE = 20;

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => ["notifications", "list"] as const,
  list: (input: { read?: boolean; limit?: number; cursor?: string } = {}) =>
    [
      "notifications",
      "list",
      input.read ?? "all",
      input.limit ?? 20,
      input.cursor ?? null,
    ] as const,
  infinites: () => ["notifications", "infinite"] as const,
  infinite: (input: { read?: boolean; limit?: number } = {}) =>
    ["notifications", "infinite", input.read ?? "all", input.limit ?? PAGE_SIZE] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function notificationsQueryOptions(
  apiClient: ApiClient,
  input: { read?: boolean; limit?: number; cursor?: string } = {},
) {
  return {
    queryKey: notificationKeys.list(input),
    queryFn: () => apiClient.getMyNotifications(input),
  };
}

export function infiniteNotificationsQueryOptions(
  apiClient: ApiClient,
  input: { read?: boolean; limit?: number } = {},
) {
  const limit = input.limit ?? PAGE_SIZE;
  return {
    queryKey: notificationKeys.infinite({ read: input.read, limit }),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      apiClient.getMyNotifications({ read: input.read, limit, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: NotificationPage) =>
      lastPage.meta.hasMore ? (lastPage.meta.nextCursor ?? undefined) : undefined,
  };
}

export function unreadNotificationsQueryOptions(apiClient: ApiClient) {
  return {
    queryKey: notificationKeys.unreadCount,
    queryFn: () => apiClient.getMyNotifications({ read: false, limit: 1 }),
  };
}

export function snapshotNotificationCaches(queryClient: QueryClient) {
  return {
    lists: queryClient.getQueriesData<NotificationPage>({ queryKey: notificationKeys.lists() }),
    infinites: queryClient.getQueriesData<InfiniteData<NotificationPage>>({
      queryKey: notificationKeys.infinites(),
    }),
    unread: queryClient.getQueryData<NotificationPage>(notificationKeys.unreadCount),
  };
}

export function restoreNotificationCaches(
  queryClient: QueryClient,
  snapshot: ReturnType<typeof snapshotNotificationCaches> | undefined,
) {
  if (!snapshot) return;
  for (const [key, value] of snapshot.lists) {
    queryClient.setQueryData(key, value);
  }
  for (const [key, value] of snapshot.infinites) {
    queryClient.setQueryData(key, value);
  }
  queryClient.setQueryData(notificationKeys.unreadCount, snapshot.unread);
}

// Apply a page-level transform to every cached notification list — both the single-page
// (`list`) caches used by the bell and the paginated (`infinite`) cache used by the page.
// `readFilter` is the cache's read scope (`true` | `false` | `"all"`).
function updateListCaches(
  queryClient: QueryClient,
  transformPage: (page: NotificationPage, readFilter: unknown) => NotificationPage,
) {
  for (const [key, value] of queryClient.getQueriesData<NotificationPage>({
    queryKey: notificationKeys.lists(),
  })) {
    if (value) queryClient.setQueryData<NotificationPage>(key, transformPage(value, key[2]));
  }
  for (const [key, value] of queryClient.getQueriesData<InfiniteData<NotificationPage>>({
    queryKey: notificationKeys.infinites(),
  })) {
    if (!value) continue;
    queryClient.setQueryData<InfiniteData<NotificationPage>>(key, {
      ...value,
      pages: value.pages.map((page) => transformPage(page, key[2])),
    });
  }
}

function isUnreadInCaches(queryClient: QueryClient, id: string) {
  const inList = queryClient
    .getQueriesData<NotificationPage>({ queryKey: notificationKeys.lists() })
    .some(([, value]) => value?.data.some((n) => n.id === id && !n.read));
  if (inList) return true;
  return queryClient
    .getQueriesData<InfiniteData<NotificationPage>>({ queryKey: notificationKeys.infinites() })
    .some(([, value]) =>
      value?.pages.some((page) => page.data.some((n) => n.id === id && !n.read)),
    );
}

export function markNotificationReadInCache(queryClient: QueryClient, id: string) {
  const wasUnread = isUnreadInCaches(queryClient, id);

  updateListCaches(queryClient, (page, readFilter) => {
    const isUnreadList = readFilter === false;
    const removed = isUnreadList && page.data.some((n) => n.id === id);
    return {
      ...page,
      data: page.data
        .map((n) => (n.id === id ? { ...n, read: true } : n))
        .filter((n) => !(isUnreadList && n.id === id)),
      meta: { ...page.meta, total: removed ? Math.max(page.meta.total - 1, 0) : page.meta.total },
    };
  });

  if (wasUnread) {
    queryClient.setQueryData<NotificationPage>(notificationKeys.unreadCount, (current) =>
      current
        ? {
            ...current,
            data: current.data.filter((n) => n.id !== id),
            meta: { ...current.meta, total: Math.max(current.meta.total - 1, 0) },
          }
        : current,
    );
  }
}

export function markAllNotificationsReadInCache(queryClient: QueryClient) {
  updateListCaches(queryClient, (page, readFilter) => {
    const isUnreadList = readFilter === false;
    return {
      ...page,
      data: isUnreadList ? [] : page.data.map((n) => ({ ...n, read: true })),
      meta: { ...page.meta, total: isUnreadList ? 0 : page.meta.total },
    };
  });

  queryClient.setQueryData<NotificationPage>(notificationKeys.unreadCount, (current) =>
    current ? { ...current, data: [], meta: { ...current.meta, total: 0 } } : current,
  );
}

function matchesReadFilter(readFilter: unknown, read: boolean) {
  if (readFilter === true) return read;
  if (readFilter === false) return !read;
  return true;
}

export function addNotificationToCache(queryClient: QueryClient, notification: NotificationRecord) {
  for (const [key, value] of queryClient.getQueriesData<NotificationPage>({
    queryKey: notificationKeys.lists(),
  })) {
    if (!value || !matchesReadFilter(key[2], notification.read)) continue;
    const limit = typeof key[3] === "number" ? key[3] : value.data.length;
    const data = [notification, ...value.data.filter((n) => n.id !== notification.id)].slice(
      0,
      limit,
    );
    queryClient.setQueryData<NotificationPage>(key, {
      ...value,
      data,
      meta: { ...value.meta, total: value.meta.total + 1 },
    });
  }

  for (const [key, value] of queryClient.getQueriesData<InfiniteData<NotificationPage>>({
    queryKey: notificationKeys.infinites(),
  })) {
    if (!value || value.pages.length === 0 || !matchesReadFilter(key[2], notification.read))
      continue;
    queryClient.setQueryData<InfiniteData<NotificationPage>>(key, {
      ...value,
      pages: value.pages.map((page, index) => {
        const deduped = page.data.filter((n) => n.id !== notification.id);
        return index === 0
          ? {
              ...page,
              data: [notification, ...deduped],
              meta: { ...page.meta, total: page.meta.total + 1 },
            }
          : { ...page, data: deduped };
      }),
    });
  }

  if (!notification.read) {
    queryClient.setQueryData<NotificationPage>(notificationKeys.unreadCount, (current) =>
      current
        ? {
            ...current,
            data: [notification],
            meta: { ...current.meta, total: current.meta.total + 1 },
          }
        : current,
    );
  }
}

export function notificationTypeLabel(type: string) {
  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diffSeconds = Math.round((time - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds || unit === "second") {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "";
}
