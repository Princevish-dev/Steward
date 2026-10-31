import { createHash } from "node:crypto";
import { GENESIS_HASH } from "@/core/ledger/append";
import type { LedgerEntry, LedgerVerification } from "@/core/ledger/types";
import { canonicalJson } from "@/core/ledger/canonical";

function hashEntry(entry: Omit<LedgerEntry, "entryHash">): string {
  return createHash("sha256").update(canonicalJson(entry)).digest("hex");
}

export function verifyLedger(entries: readonly LedgerEntry[]): LedgerVerification {
  let previousHash = GENESIS_HASH;
  for (const entry of entries) {
    const { entryHash: _, ...entryWithoutHash } = entry;
    if (entry.prevHash !== previousHash || hashEntry(entryWithoutHash) !== entry.entryHash) {
      return { valid: false, invalidSequence: entry.sequence };
    }
    previousHash = entry.entryHash;
  }
  return { valid: true };
}
