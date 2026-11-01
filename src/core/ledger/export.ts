import type { LedgerEntry } from "@/core/ledger/types";
import { verifyLedger } from "@/core/ledger/verify";

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes("\r")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function formatLedgerCsv(entries: readonly LedgerEntry[]): string {
  const headers = ["sequence", "timestamp", "type", "runId", "mandateId", "prevHash", "entryHash", "payload"];
  const rows = entries.map((entry) => [
    entry.sequence,
    entry.timestamp,
    entry.type,
    entry.runId,
    entry.mandateId,
    entry.prevHash,
    entry.entryHash,
    JSON.stringify(entry.payload)
  ].map(escapeCsvCell).join(","));

  return [headers.join(","), ...rows].join("\r\n");
}

export function formatLedgerJson(mandateId: string, entries: readonly LedgerEntry[]) {
  return {
    mandateId,
    exportedAt: new Date().toISOString(),
    count: entries.length,
    verification: verifyLedger(entries),
    entries
  };
}
