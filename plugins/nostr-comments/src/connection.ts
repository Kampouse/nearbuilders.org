// src/connection.ts — Client-side Nostr connection manager
//
// Drop this into the frontend (ui/src/lib/nostr.ts).
// Works with NIP-07 extensions, ephemeral keys, or no connection (read-only).

import { finalizeEvent, type EventTemplate, type NostrEvent } from "nostr-tools/pure";
import { generateSecretKey } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// ── Types ────────────────────────────────────────────────────────────────────

export type ConnectionMethod = "extension" | "ephemeral" | "none";

export interface NostrConnection {
  method: ConnectionMethod;
  pubkey: string;        // hex
  npub: string;          // bech32 encoded
  sign: (event: EventTemplate) => Promise<NostrEvent>;
  disconnect: () => void;
}

export interface ReadOnlyConnection {
  method: "none";
  sign: never;
  disconnect: () => void;
}

// ── Storage keys ─────────────────────────────────────────────────────────────

const EPHEMERAL_KEY_STORAGE = "nbs:nostr:secret";
const PREF_METHOD_STORAGE = "nbs:nostr:method";

// ── Utils ────────────────────────────────────────────────────────────────────

function hexToNpub(hex: string): string {
  const bytes = hexToBytes(hex);
  return bech32.encode("npub", bech32.toWords(bytes));
}

function hasNIP07(): boolean {
  return typeof window !== "undefined" && "nostr" in window;
}

// ── NIP-07 Extension Connection ──────────────────────────────────────────────

async function connectExtension(): Promise<NostrConnection> {
  if (!hasNIP07()) {
    throw new Error("No NIP-07 extension found. Install Alby or nos2x.");
  }

  const ext = (window as any).nostr;
  const pubkey = await ext.getPublicKey();

  localStorage.setItem(PREF_METHOD_STORAGE, "extension");

  return {
    method: "extension",
    pubkey,
    npub: hexToNpub(pubkey),
    sign: async (template: EventTemplate) => {
      return ext.signEvent(template);
    },
    disconnect: () => {
      localStorage.removeItem(PREF_METHOD_STORAGE);
    },
  };
}

// ── Ephemeral Key Connection ─────────────────────────────────────────────────

function connectEphemeral(): NostrConnection {
  let secret = localStorage.getItem(EPHEMERAL_KEY_STORAGE);

  if (!secret) {
    const sk = generateSecretKey();
    secret = bytesToHex(sk);
    localStorage.setItem(EPHEMERAL_KEY_STORAGE, secret);
  }

  // Derive pubkey from secret
  const { getPublicKey } = require("nostr-tools/pure");
  const pubkey = getPublicKey(hexToBytes(secret));

  localStorage.setItem(PREF_METHOD_STORAGE, "ephemeral");

  return {
    method: "ephemeral",
    pubkey,
    npub: hexToNpub(pubkey),
    sign: async (template: EventTemplate) => {
      return finalizeEvent(template, hexToBytes(secret!));
    },
    disconnect: () => {
      localStorage.removeItem(EPHEMERAL_KEY_STORAGE);
      localStorage.removeItem(PREF_METHOD_STORAGE);
    },
  };
}

// ── Auto-connect (restore previous session) ──────────────────────────────────

export function restoreConnection(): NostrConnection | ReadOnlyConnection {
  const pref = localStorage.getItem(PREF_METHOD_STORAGE);

  if (pref === "extension" && hasNIP07()) {
    // Re-connect to extension (async, but we return sync — caller should use connect())
    // Fall through to ephemeral if extension is gone
  }

  if (pref === "ephemeral" || (pref === "extension" && !hasNIP07())) {
    const secret = localStorage.getItem(EPHEMERAL_KEY_STORAGE);
    if (secret) return connectEphemeral();
  }

  return {
    method: "none",
    disconnect: () => {},
  };
}

// ── Primary connect entry point ──────────────────────────────────────────────

export async function connectNostr(
  preferred: "extension" | "ephemeral" = "extension",
): Promise<NostrConnection> {
  if (preferred === "extension" && hasNIP07()) {
    try {
      return await connectExtension();
    } catch {
      // Extension rejected or errored — fall back to ephemeral
      return connectEphemeral();
    }
  }

  return connectEphemeral();
}

// ── NEAR Attestation (optional verification layer) ───────────────────────────

/**
 * After connecting via extension or ephemeral, optionally attest the Nostr
 * pubkey against the user's NEAR wallet. This creates a verifiable link:
 *
 *   "alice.near attests that npub1xyz... is their Nostr identity"
 *
 * The attestation is stored on the builder profile and can be verified
 * by anyone reading the Nostr event's tags.
 *
 * Triggers a NEAR wallet popup (NEP-413 signMessage).
 */
export async function attestToNear(
  connection: NostrConnection,
  nearAccount: string,
): Promise<void> {
  // Dynamically import to avoid bundling attestation code on read-only pages
  const { requestAttestation } = await import("./attestation");

  const attestation = await requestAttestation({
    nostrPubkey: connection.pubkey,
    nearAccount,
  });

  // POST to the plugin's attestation endpoint
  const response = await fetch("/api/v1/nostr/attest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send session cookie
    body: JSON.stringify(attestation),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Attestation failed: ${error.message ?? response.statusText}`,
    );
  }

  const result = await response.json();
  console.log(`[Nostr] ✅ Verified: ${nearAccount} → ${result.npub}`);
}
