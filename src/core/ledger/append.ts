import { createHash } from "node:crypto";
import type { LedgerEntry } from "@/core/ledger/types";
import { canonicalJson } from "@/core/ledger/canonical";

export const GENESIS_HASH = "0".repeat(64);

function hashEntry(entry: Omit<LedgerEntry, "entryHash">): string {
  return createHash("sha256").update(canonicalJson(entry)).digest("hex");
}

export function appendLedgerEntry(
  entries: readonly LedgerEntry[],
  input: Omit<LedgerEntry, "sequence" | "timestamp" | "prevHash" | "entryHash">,
  timestamp = new Date()
): LedgerEntry {
  const previous = entries.at(-1);
  const entryWithoutHash: Omit<LedgerEntry, "entryHash"> = {
    ...input,
    sequence: (previous?.sequence ?? 0) + 1,
    timestamp: timestamp.toISOString(),
    prevHash: previous?.entryHash ?? GENESIS_HASH
  };
  return { ...entryWithoutHash, entryHash: hashEntry(entryWithoutHash) };
}

export function idempotencyKey(runId: string, cartHash: string): string {
  return createHash("sha256").update(`${runId}${cartHash}`).digest("hex");
}
