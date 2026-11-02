import { createHash } from "node:crypto";
import { GENESIS_HASH } from "@/core/ledger/append";
import type { LedgerEntry, LedgerVerification } from "@/core/ledger/types";
import { canonicalJson } from "@/core/ledger/canonical";

function hashEntry(entry: Omit<LedgerEntry, "entryHash">): string {
  const { userId: _userId, ...canonicalEntry } = entry as Omit<LedgerEntry, "entryHash"> & { userId?: string };
  return createHash("sha256").update(canonicalJson(canonicalEntry)).digest("hex");
}

function hashLegacyEntry(entry: Omit<LedgerEntry, "entryHash">, userId: string): string {
  return createHash("sha256").update(canonicalJson({ ...entry, userId })).digest("hex");
}

export function verifyLedger(entries: readonly LedgerEntry[], legacyUserId?: string): LedgerVerification {
  let previousHash = GENESIS_HASH;
  for (const entry of entries) {
    const { entryHash: _, ...entryWithoutHash } = entry;
    const currentHashMatches = hashEntry(entryWithoutHash) === entry.entryHash;
    const legacyHashMatches = legacyUserId !== undefined && hashLegacyEntry(entryWithoutHash, legacyUserId) === entry.entryHash;
    if (entry.prevHash !== previousHash || (!currentHashMatches && !legacyHashMatches)) {
      return { valid: false, invalidSequence: entry.sequence };
    }
    previousHash = entry.entryHash;
  }
  return { valid: true };
}
