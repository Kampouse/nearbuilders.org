import { describe, expect, it } from "vitest";
import { buildApprovalNotification } from "../../src/index";

describe("approval notification mapping", () => {
  it("maps approved projects to the mission project link", () => {
    expect(
      buildApprovalNotification({
        pluginId: "projects",
        entityId: "project-1",
        appliedResourceId: "project-1",
        createdBy: "user-1",
        payload: { title: "Example Project", slug: "example-project" },
      }),
    ).toMatchObject({
      userId: "user-1",
      type: "project_approved",
      source: "projects",
      subject: "Example Project approved",
      link: "/projects/project/example-project",
    });
  });

  it("maps approved events to event links", () => {
    expect(
      buildApprovalNotification({
        pluginId: "events",
        entityId: "event-1",
        appliedResourceId: "event-1",
        createdBy: "user-2",
        payload: { title: "Demo Day", slug: "demo-day" },
      }),
    ).toMatchObject({
      userId: "user-2",
      type: "event_approved",
      source: "events",
      subject: "Demo Day approved",
      link: "/events/demo-day",
    });
  });

  it("maps approved builders to builder links", () => {
    expect(
      buildApprovalNotification({
        pluginId: "builders",
        entityId: "alice.near",
        appliedResourceId: "alice.near",
        createdBy: "user-3",
        payload: { name: "Alice" },
      }),
    ).toMatchObject({
      userId: "user-3",
      type: "builder_approved",
      source: "builders",
      subject: "Alice approved",
      link: "/builders/alice.near",
    });
  });

  it("ignores unsupported proposal plugins", () => {
    expect(
      buildApprovalNotification({
        pluginId: "votes",
        entityId: "vote-1",
        appliedResourceId: null,
        createdBy: "user-4",
        payload: {},
      }),
    ).toBeNull();
  });
});
