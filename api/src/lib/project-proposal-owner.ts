import { ORPCError } from "every-plugin/orpc";

export interface ProjectProposalContext {
  userId?: string;
  walletAddress?: string;
  user?: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };
  organizationId?: string;
  apiKey?: {
    id: string;
    name: string | null;
    permissions: Record<string, string[]> | null;
  };
  reqHeaders?: Headers;
  getRawBody?: () => Promise<string>;
}

function readOwnerId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "unknown") return undefined;
  return trimmed;
}

export function resolveProjectProposalOwner(
  payload: Record<string, unknown>,
  createdBy: string,
): string {
  const ownerId = readOwnerId(payload.ownerId) ?? readOwnerId(createdBy);
  if (!ownerId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Project proposal must identify the project owner",
    });
  }
  return ownerId;
}

export function createProjectProposalOwnerContext(
  context: ProjectProposalContext,
  ownerId: string,
): ProjectProposalContext {
  const normalizedOwnerId = readOwnerId(ownerId);
  if (!normalizedOwnerId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Project proposal must identify the project owner",
    });
  }

  return {
    ...context,
    userId: normalizedOwnerId,
    walletAddress: normalizedOwnerId,
    user: {
      id: normalizedOwnerId,
      role: "user",
    },
  };
}

export function assertProjectProposalOwner(actualOwnerId: string, expectedOwnerId: string) {
  const actual = readOwnerId(actualOwnerId);
  const expected = readOwnerId(expectedOwnerId);
  if (!actual || !expected || actual !== expected) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Project owner does not match proposal owner",
    });
  }
}
