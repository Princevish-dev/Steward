export type LedgerEntry = {
  sequence: number;
  timestamp: string;
  type: string;
  runId: string;
  mandateId: string;
  payload: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
};

export type LedgerVerification = {
  valid: boolean;
  invalidSequence?: number;
};
