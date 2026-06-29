import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  addNotificationToCache,
  type NotificationPage,
  type NotificationRecord,
  notificationKeys,
} from "./notifications";

function page(data: NotificationRecord[] = [], total = data.length): NotificationPage {
  return {
    data,
    meta: { total, hasMore: false, nextCursor: null },
  };
}

const notification: NotificationRecord = {
  id: "notification-1",
  userId: "alice.near",
  type: "project_rejected",
  source: "projects",
  subject: "Project rejected",
  body: "Reason",
  link: "/dashboard",
  read: false,
  createdAt: "2026-06-30T00:00:00.000Z",
};

describe("addNotificationToCache", () => {
  it("does not double count the same live notification", () => {
    const queryClient = new QueryClient();
    const listKey = notificationKeys.list({ limit: 5 });

    queryClient.setQueryData(listKey, page());
    queryClient.setQueryData(notificationKeys.unreadCount, page());

    addNotificationToCache(queryClient, notification);
    addNotificationToCache(queryClient, notification);

    expect(queryClient.getQueryData<NotificationPage>(listKey)?.data).toHaveLength(1);
    expect(queryClient.getQueryData<NotificationPage>(listKey)?.meta.total).toBe(1);
    expect(
      queryClient.getQueryData<NotificationPage>(notificationKeys.unreadCount)?.meta.total,
    ).toBe(1);
  });
});
