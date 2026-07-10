import { hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

export function hasNIP07(): boolean {
  return typeof window !== "undefined" && "nostr" in window;
}

function hexToNpub(hex: string): string {
  return bech32.encode("npub", bech32.toWords(hexToBytes(hex)));
}

export async function getNostrNpub(): Promise<string> {
  if (!hasNIP07()) throw new Error("No NIP-07 extension found");
  const ext = (window as any).nostr;
  return hexToNpub(await ext.getPublicKey());
}

export async function signNostrEvent(template: {
  kind: number;
  content: string;
  created_at: number;
  tags: string[][];
}): Promise<{
  id: string;
  pubkey: string;
  created_at: number;
  kind: 1;
  tags: string[][];
  content: string;
  sig: string;
}> {
  if (!hasNIP07()) throw new Error("No NIP-07 extension found");
  const ext = (window as any).nostr;
  return ext.signEvent(template);
}
