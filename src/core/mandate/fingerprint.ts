import { createHash, timingSafeEqual } from "node:crypto";
import type { Mandate } from "@/core/mandate/schema";
import { canonicalJson } from "@/core/ledger/canonical";

export type FingerprintedMandate = Mandate & {
  fingerprint?: string;
  version?: number;
  previousVersionId?: string;
};

export function mandateFingerprintEnabled(
  env: { FEATURE_MANDATE_FINGERPRINT?: string } = process.env as { FEATURE_MANDATE_FINGERPRINT?: string },
): boolean {
  return env.FEATURE_MANDATE_FINGERPRINT?.trim().toLowerCase() !== "false";
}

export function mandateFingerprint(mandate: FingerprintedMandate): string {
  const { status: _status, fingerprint: _fingerprint, ...immutableMandate } = mandate;
  return createHash("sha256").update(canonicalJson(immutableMandate)).digest("hex");
}

export function verifyMandateFingerprint(mandate: FingerprintedMandate): boolean {
  if (!mandate.fingerprint || !/^[a-f0-9]{64}$/i.test(mandate.fingerprint)) return false;
  const actual = Buffer.from(mandateFingerprint(mandate), "hex");
  const expected = Buffer.from(mandate.fingerprint, "hex");
  return timingSafeEqual(actual, expected);
}
