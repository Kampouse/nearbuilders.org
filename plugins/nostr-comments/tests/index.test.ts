import { describe, expect, it } from "bun:test";
import { finalizeEvent, type EventTemplate, type NostrEvent } from "nostr-tools/pure";
import { bytesToHex } from "@noble/hashes/utils";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";

// ── Test helpers ─────────────────────────────────────────────────────────────

function createTestKeyPair() {
  const sk = generateSecretKey();
  const pubkey = getPublicKey(sk);
  return { sk, pubkey, hex: bytesToHex(sk) };
}

function makeCommentEvent(
  projectId: string,
  content: string,
  sk: Uint8Array,
  replyTo?: string,
): NostrEvent {
  const template: EventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["t", "nbs"],
      ["p", "alice.near"],
      ["project", projectId],
      ...(replyTo ? [["e", replyTo, "", "reply"]] : []),
    ],
    content,
  };
  return finalizeEvent(template, sk);
}

function makeNewsEvent(
  projectId: string,
  type: string,
  title: string,
  body: string,
  sk: Uint8Array,
): NostrEvent {
  const template: EventTemplate = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", `${projectId}-${type}-${Date.now()}`],
      ["t", "nbs-news"],
      ["project", projectId],
      ["news_type", type],
      ["title", title],
      ["p", "alice.near"],
    ],
    content: body,
  };
  return finalizeEvent(template, sk);
}

// ── Contract tests ───────────────────────────────────────────────────────────

describe("contract", async () => {
  const { contract } = await import("../src/contract");

  it("should define listComments endpoint", () => {
    expect(contract.listComments).toBeDefined();
  });

  it("should define createComment endpoint", () => {
    expect(contract.createComment).toBeDefined();
  });

  it("should define listNews endpoint", () => {
    expect(contract.listNews).toBeDefined();
  });

  it("should define publishNews endpoint", () => {
    expect(contract.publishNews).toBeDefined();
  });

  it("should define attestNostr endpoint", () => {
    expect(contract.attestNostr).toBeDefined();
  });

  it("should define getAttestation endpoint", () => {
    expect(contract.getAttestation).toBeDefined();
  });

  it("should define ping endpoint", () => {
    expect(contract.ping).toBeDefined();
  });
});

// ── Nostr event tests ────────────────────────────────────────────────────────

describe("Nostr event creation", () => {
  it("should create a valid signed comment event", () => {
    const { sk } = createTestKeyPair();
    const event = makeCommentEvent("proj_test1", "Great project!", sk);

    expect(event.kind).toBe(1);
    expect(event.content).toBe("Great project!");
    expect(event.sig).toBeTruthy();
    expect(event.id).toBeTruthy();
    expect(event.tags).toContainEqual(["t", "nbs"]);
    expect(event.tags.some((t) => t[0] === "project" && t[1] === "proj_test1")).toBe(true);
  });

  it("should create a comment event with reply tag", () => {
    const { sk } = createTestKeyPair();
    const parent = makeCommentEvent("proj_test1", "Parent", sk);
    const reply = makeCommentEvent("proj_test1", "Reply", sk, parent.id);

    const replyTag = reply.tags.find((t) => t[0] === "e" && t[3] === "reply");
    expect(replyTag).toBeDefined();
    expect(replyTag![1]).toBe(parent.id);
  });

  it("should create a valid signed news event", () => {
    const { sk } = createTestKeyPair();
    const event = makeNewsEvent("proj_test1", "update", "v2 shipped", "Body text", sk);

    expect(event.kind).toBe(30078);
    expect(event.content).toBe("Body text");
    expect(event.sig).toBeTruthy();
    expect(event.tags.some((t) => t[0] === "title" && t[1] === "v2 shipped")).toBe(true);
    expect(event.tags.some((t) => t[0] === "news_type" && t[1] === "update")).toBe(true);
  });
});

// ── Event verification tests ─────────────────────────────────────────────────

describe("event verification", () => {
  it("should verify a validly signed event", async () => {
    const { verifyEvent } = await import("nostr-tools/pure");
    const { sk } = createTestKeyPair();
    const event = makeCommentEvent("proj_test1", "Test", sk);

    expect(verifyEvent(event)).toBe(true);
  });

  it("should reject a tampered event", async () => {
    const { verifyEvent } = await import("nostr-tools/pure");
    const { sk } = createTestKeyPair();
    const event = makeCommentEvent("proj_test1", "Original", sk);

    event.content = "Tampered";
    expect(verifyEvent(event)).toBe(false);
  });
});

// ── Attestation tests ────────────────────────────────────────────────────────

describe("attestation", async () => {
  const { verifyAttestation } = await import("../src/attestation");

  it("should reject an attestation with invalid signature", () => {
    const result = verifyAttestation({
      accountId: "alice.near",
      publicKey: "ed25519:invalid",
      signature: "aGkJyD6STI+kWvO10Z3DlQeRckV80MH3/T5I4yzkPDIxqpDsz3X+9vT7y3mUrZzlnkfNn1GSQ1JNPkcF++I3Bw==",
      message: JSON.stringify({
        action: "attest-nostr-identity",
        platform: "nearbuilders.org",
        nearAccount: "alice.near",
        nostrPubkey: "deadbeef",
        timestamp: Date.now(),
      }),
      nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      recipient: "nearbuilders.org",
      nostrPubkey: "deadbeef",
      createdAt: Math.floor(Date.now() / 1000),
    });

    expect(result.valid).toBe(false);
  });

  it("should reject attestation when account mismatch", () => {
    const result = verifyAttestation({
      accountId: "alice.near",
      publicKey: "ed25519:6TupyNrcHGTt5XRLmHTc2KGaiSbjhQi1KHtCXTgbcr4Y",
      signature: "",
      message: JSON.stringify({
        action: "attest-nostr-identity",
        platform: "nearbuilders.org",
        nearAccount: "bob.near", // different!
        nostrPubkey: "deadbeef",
        timestamp: Date.now(),
      }),
      nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      recipient: "nearbuilders.org",
      nostrPubkey: "deadbeef",
      createdAt: Math.floor(Date.now() / 1000),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Account mismatch");
  });

  it("should reject non-attestation messages", () => {
    const result = verifyAttestation({
      accountId: "alice.near",
      publicKey: "ed25519:6TupyNrcHGTt5XRLmHTc2KGaiSbjhQi1KHtCXTgbcr4Y",
      signature: "",
      message: JSON.stringify({ action: "something-else" }),
      nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      recipient: "nearbuilders.org",
      nostrPubkey: "deadbeef",
      createdAt: Math.floor(Date.now() / 1000),
    });

    expect(result.valid).toBe(false);
  });
});

// ── npub encoding tests ──────────────────────────────────────────────────────

describe("npub encoding", () => {
  it("should encode and decode hex pubkey to npub", async () => {
    const { bech32 } = await import("@scure/base");
    const { hexToBytes } = await import("@noble/hashes/utils");

    const hex = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
    const bytes = hexToBytes(hex);
    const npub = bech32.encode("npub", bech32.toWords(bytes));

    expect(npub).toMatch(/^npub1/);

    // Decode back
    const decoded = bech32.decode(npub);
    const decodedHex = bytesToHex(new Uint8Array(bech32.fromWords(decoded.words)));
    expect(decodedHex).toBe(hex);
  });
});
