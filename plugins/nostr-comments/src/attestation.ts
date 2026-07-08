// src/attestation.ts — NEP-413 Nostr identity attestation
//
// Links a NEAR account to a Nostr npub via off-chain wallet signature.
// The user signs a message with their NEAR Full Access Key proving
// ownership of both the NEAR account and the Nostr pubkey.

import { PublicKey } from "near-api-js/lib/utils";
import { serialize } from "borsh";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ── NEP-413 Constants ────────────────────────────────────────────────────────

const NEP_413_PREFIX = 2147484061; // 2**31 + 413

// ── Types ────────────────────────────────────────────────────────────────────

export interface AttestationRequest {
  /** The Nostr pubkey (hex) being attested */
  nostrPubkey: string;
  /** The NEAR account name (e.g. "alice.near") */
  nearAccount: string;
}

export interface Attestation {
  /** NEAR account that signed */
  accountId: string;
  /** NEAR public key used to sign (e.g. "ed25519:...") */
  publicKey: string;
  /** Base64 Ed25519 signature */
  signature: string;
  /** The message that was signed */
  message: string;
  /** 32-byte nonce used (base64) */
  nonce: string;
  /** Recipient specified during signing */
  recipient: string;
  /** The Nostr pubkey being attested (hex) */
  nostrPubkey: string;
  /** Unix timestamp of attestation */
  createdAt: number;
}

export interface VerifiedAttestation {
  valid: boolean;
  accountId: string;
  nostrPubkey: string;
  error?: string;
}

// ── Borsh Schema for NEP-413 Payload ─────────────────────────────────────────

enum BorshKind {
  String = 10,
  Array = 11,
}

// NEP-413 Payload Borsh serialization
// struct Payload {
//   message: string,
//   nonce: [u8; 32],
//   recipient: string,
//   callbackUrl?: string
// }

function borshSerializeString(str: string): Buffer {
  const encoded = Buffer.from(str, "utf-8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(encoded.length, 0);
  return Buffer.concat([len, encoded]);
}

function borshSerializeNonce(nonce: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(nonce.length, 0);
  return Buffer.concat([len, Buffer.from(nonce)]);
}

function borshSerializeU32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

/**
 * Constructs the NEP-413 message hash that the wallet signed.
 *
 * Per NEP-413:
 *   sha256(borsh_serialize(2**31 + 413) + borsh_serialize(Payload{message, nonce, recipient, callbackUrl}))
 *
 * callbackUrl is optional — if present it's included, if absent it's omitted
 * and the Payload borsh serialization only contains message, nonce, recipient.
 */
function buildNEP413Hash(
  message: string,
  nonce: Uint8Array,
  recipient: string,
  callbackUrl?: string,
): Uint8Array {
  // Serialize the prefix tag: 2**31 + 413
  const prefix = borshSerializeU32(NEP_413_PREFIX);

  // Serialize the payload
  const messageBuf = borshSerializeString(message);
  const nonceBuf = borshSerializeNonce(nonce);
  const recipientBuf = borshSerializeString(recipient);
  const callbackBuf = callbackUrl ? borshSerializeString(callbackUrl) : Buffer.alloc(0);

  const payload = Buffer.concat([messageBuf, nonceBuf, recipientBuf, callbackBuf]);

  // SHA256 of prefix + payload
  return sha256(Buffer.concat([prefix, payload]));
}

// ── Client: Request attestation from NEAR wallet ─────────────────────────────

/**
 * Called from the frontend. Triggers a NEAR wallet signature request
 * asking the user to attest their Nostr identity.
 *
 * Usage:
 *   const attestation = await requestAttestation({
 *     nostrPubkey: connection.pubkey,
 *     nearAccount: "alice.near",
 *   });
 *   await fetch("/api/v1/nostr/attest", { method: "POST", body: JSON.stringify(attestation) });
 */
export async function requestAttestation(
  req: AttestationRequest,
  options?: {
    recipient?: string;
    callbackUrl?: string;
    state?: string;
  },
): Promise<Attestation> {
  const message = buildAttestationMessage(req.nearAccount, req.nostrPubkey);
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const recipient = options?.recipient ?? "nearbuilders.org";
  const createdAt = Math.floor(Date.now() / 1000);

  // Call wallet.signMessage via the NEAR wallet selector or injected wallet
  // This triggers a wallet popup — user approves the signature
  const signMessageResult = await callNearSignMessage({
    message,
    recipient,
    nonce,
    callbackUrl: options?.callbackUrl,
    state: options?.state,
  });

  return {
    accountId: signMessageResult.account_id,
    publicKey: signMessageResult.public_key,
    signature: signMessageResult.signature,
    message,
    nonce: Buffer.from(nonce).toString("base64"),
    recipient,
    nostrPubkey: req.nostrPubkey,
    createdAt,
  };
}

/**
 * Builds the human-readable attestation message.
 * This is what the user sees in their wallet popup.
 */
function buildAttestationMessage(nearAccount: string, nostrPubkey: string): string {
  return JSON.stringify({
    action: "attest-nostr-identity",
    platform: "nearbuilders.org",
    nearAccount,
    nostrPubkey,
    statement: `I verify that this Nostr identity belongs to ${nearAccount}`,
    timestamp: Date.now(),
  });
}

/**
 * Calls the NEAR wallet's signMessage method.
 * Works with wallet selector or injected wallet (HERE wallet, MyNearWallet, etc).
 */
async function callNearSignMessage(params: {
  message: string;
  recipient: string;
  nonce: Uint8Array;
  callbackUrl?: string;
  state?: string;
}): Promise<{
  account_id: string;
  public_key: string;
  signature: string;
}> {
  // Attempt wallet selector first
  const wallet = (window as any).__nearWalletSelector ?? (window as any).near;

  if (wallet?.signMessage) {
    return wallet.signMessage({
      message: params.message,
      recipient: params.recipient,
      nonce: Array.from(params.nonce),
      callbackUrl: params.callbackUrl,
      state: params.state,
    });
  }

  // Fallback: redirect-based signing (MyNearWallet)
  // This will redirect the browser to the wallet, which returns
  // the signature as URL fragments to the callbackUrl
  if (params.callbackUrl) {
    const url = new URL(`${wallet?.walletUrl ?? "https://app.mynearwallet.com"}/sign-message`);
    url.searchParams.set("message", params.message);
    url.searchParams.set("recipient", params.recipient);
    url.searchParams.set("nonce", Buffer.from(params.nonce).toString("base64"));
    url.searchParams.set("callbackUrl", params.callbackUrl);
    if (params.state) url.searchParams.set("state", params.state);

    window.location.href = url.toString();
    // Page redirects — result comes back via URL fragments
    // The calling code needs to handle the callback
    return new Promise(() => {}); // Never resolves (page navigates away)
  }

  throw new Error("No NEAR wallet found for signMessage. Install HERE Wallet or MyNearWallet.");
}

// ── Server: Verify attestation ───────────────────────────────────────────────

/**
 * Verifies a NEP-413 attestation signature.
 *
 * Returns whether the NEAR account genuinely signed the message
 * linking their account to the given Nostr pubkey.
 *
 * This runs server-side (in the plugin) or can be called from the
 * platform's auth layer to validate attestation before storing it.
 */
export function verifyAttestation(attestation: Attestation): VerifiedAttestation {
  try {
    // 1. Decode nonce from base64
    const nonce = new Uint8Array(
      Buffer.from(attestation.nonce, "base64"),
    );

    // 2. Reconstruct the NEP-413 hash
    const hash = buildNEP413Hash(
      attestation.message,
      nonce,
      attestation.recipient,
    );

    // 3. Parse the NEAR public key
    const publicKey = PublicKey.fromString(attestation.publicKey);

    // 4. Decode the signature from base64
    const signature = Buffer.from(attestation.signature, "base64");

    // 5. Verify Ed25519 signature against the hash
    // NEAR uses Ed25519 signatures of SHA-256 hashes
    const isValid = publicKey.verify(signature, Buffer.from(hash));

    if (!isValid) {
      return {
        valid: false,
        accountId: attestation.accountId,
        nostrPubkey: attestation.nostrPubkey,
        error: "Signature verification failed",
      };
    }

    // 6. Verify the message content matches expected attestation format
    const parsed = JSON.parse(attestation.message);

    if (parsed.action !== "attest-nostr-identity") {
      return {
        valid: false,
        accountId: attestation.accountId,
        nostrPubkey: attestation.nostrPubkey,
        error: "Not an attestation message",
      };
    }

    if (parsed.nearAccount !== attestation.accountId) {
      return {
        valid: false,
        accountId: attestation.accountId,
        nostrPubkey: attestation.nostrPubkey,
        error: "Account mismatch: message account doesn't match signer",
      };
    }

    if (parsed.nostrPubkey !== attestation.nostrPubkey) {
      return {
        valid: false,
        accountId: attestation.accountId,
        nostrPubkey: attestation.nostrPubkey,
        error: "Nostr pubkey mismatch in message",
      };
    }

    return {
      valid: true,
      accountId: attestation.accountId,
      nostrPubkey: attestation.nostrPubkey,
    };
  } catch (error) {
    return {
      valid: false,
      accountId: attestation.accountId ?? "unknown",
      nostrPubkey: attestation.nostrPubkey ?? "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Optional: Publish attestation as a Nostr event ───────────────────────────

/**
 * Publishes the attestation as a Nostr kind:0 (set-metadata) event
 * so other Nostr clients can see the NEAR ↔ Nostr linkage.
 *
 * Tags include the attestation data for independent verification.
 */
export function buildAttestationTags(attestation: Attestation): string[][] {
  return [
    ["near_account", attestation.accountId],
    ["near_public_key", attestation.publicKey],
    ["near_signature", attestation.signature],
    ["near_nonce", attestation.nonce],
    ["near_recipient", attestation.recipient],
    ["attested_at", String(attestation.createdAt)],
  ];
}
