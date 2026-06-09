import { ORPCError } from "every-plugin/orpc";
import { describe, expect, it } from "vitest";
import {
  assertProjectProposalOwner,
  createProjectProposalOwnerContext,
  resolveProjectProposalOwner,
} from "../../src/lib/project-proposal-owner";

function expectBadRequest(action: () => void) {
  try {
    action();
    throw new Error("Expected BAD_REQUEST");
  } catch (error) {
    expect(error).toBeInstanceOf(ORPCError);
    expect((error as ORPCError<string, unknown>).code).toBe("BAD_REQUEST");
  }
}

describe("project proposal owner hardening", () => {
  it("prefers an explicit payload owner", () => {
    expect(resolveProjectProposalOwner({ ownerId: " payload-owner.near " }, "creator.near")).toBe(
      "payload-owner.near",
    );
  });

  it("falls back to proposal createdBy", () => {
    expect(resolveProjectProposalOwner({}, " creator.near ")).toBe("creator.near");
  });

  it("rejects proposals without a valid owner", () => {
    expectBadRequest(() => resolveProjectProposalOwner({}, "unknown"));
    expectBadRequest(() => resolveProjectProposalOwner({ ownerId: " " }, " "));
  });

  it("runs fallback creation as the proposal owner, not the approving admin", () => {
    const context = createProjectProposalOwnerContext(
      {
        userId: "admin.near",
        walletAddress: "admin.near",
        user: {
          id: "admin.near",
          role: "admin",
          email: "admin@example.com",
        },
        apiKey: {
          id: "key_1",
          name: "Admin",
          permissions: null,
        },
      },
      "builder.near",
    );

    expect(context.userId).toBe("builder.near");
    expect(context.walletAddress).toBe("builder.near");
    expect(context.user).toEqual({ id: "builder.near", role: "user" });
    expect(context.apiKey?.id).toBe("key_1");
  });

  it("rejects an existing project whose owner differs from the proposal owner", () => {
    assertProjectProposalOwner("builder.near", "builder.near");
    expectBadRequest(() => assertProjectProposalOwner("admin.near", "builder.near"));
  });
});
