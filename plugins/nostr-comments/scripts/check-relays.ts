/**
 * Relay health check and bootstrap.
 *
 * Run standalone:  bun run scripts/check-relays.ts
 * Or import:        import { checkRelays } from "./scripts/check-relays"
 */

const PUBLIC_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://nostr.wine",
];

const SELF_HOSTED = "wss://relay.nearbuilders.org";

export interface RelayStatus {
  url: string;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}

export async function checkRelays(
  relays: string[] = [...PUBLIC_RELAYS, SELF_HOSTED],
): Promise<RelayStatus[]> {
  const { Relay, useWebSocketImplementation } = await import("nostr-tools/relay");
  useWebSocketImplementation(globalThis.WebSocket);

  const results = await Promise.all(
    relays.map(async (url): Promise<RelayStatus> => {
      const start = Date.now();
      try {
        const relay = await Promise.race([
          Relay.connect(url),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout (5s)")), 5000),
          ),
        ]);
        relay.close();
        return {
          url,
          reachable: true,
          latencyMs: Date.now() - start,
        };
      } catch (error) {
        return {
          url,
          reachable: false,
          latencyMs: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return results;
}

// CLI
if (import.meta.main) {
  console.log("\n🔌 Checking Nostr relay connectivity...\n");
  const results = await checkRelays();

  const reachable = results.filter((r) => r.reachable);
  const down = results.filter((r) => !r.reachable);

  for (const r of results) {
    const icon = r.reachable ? "✅" : "❌";
    const latency = r.latencyMs !== null ? ` ${r.latencyMs}ms` : "";
    const err = r.error ? ` (${r.error})` : "";
    console.log(`  ${icon}  ${r.url}${latency}${err}`);
  }

  console.log(`\n  ${reachable.length}/${results.length} relays reachable\n`);

  if (down.some((r) => r.url === SELF_HOSTED)) {
    console.log(`  ⚠️  Self-hosted relay (${SELF_HOSTED}) is not reachable.`);
    console.log(`     To set it up:`);
    console.log(`       cd plugins/nostr-comments/relay`);
    console.log(`       docker compose -f docker-compose.caddy.yml up -d\n`);
  }

  if (reachable.length === 0) {
    console.log("  ❌ No relays reachable. Comments will not work.\n");
    process.exit(1);
  }

  // Suggest the fastest reachable relay
  const fastest = reachable.sort((a, b) => (a.latencyMs ?? 0) - (b.latencyMs ?? 0))[0];
  console.log(`  💡 Fastest relay: ${fastest.url} (${fastest.latencyMs}ms)\n`);
}
