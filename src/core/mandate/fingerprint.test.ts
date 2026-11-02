import { describe, expect, it } from "vitest";
import type { Mandate } from "./schema";
import { mandateFingerprint, mandateFingerprintEnabled, verifyMandateFingerprint } from "./fingerprint";

const confirmedMandate: Mandate & { fingerprint: string } = {
  id: "mdt_fingerprint_test",
  owner: "owner@example.com",
  purpose: "Buy office paper",
  currency: "USD",
  period: { type: "monthly", budget: 100 },
  caps: { perItem: 20, perTransaction: 50, maxQuantityPerItem: 4 },
  askAbove: 40,
  categories: ["office_supplies"],
  merchants: { allow: ["paper.example"], deny: [] },
  velocity: { maxAutoPurchasesPer24h: 3 },
  expiresAt: "2026-12-01T00:00:00.000Z",
  status: "ACTIVE",
  fingerprint: ""
};

describe("mandate fingerprint", () => {
  it("is stable across status changes and its own stored fingerprint", () => {
    const first = mandateFingerprint(confirmedMandate);
    const changedLifecycle = {
      ...confirmedMandate,
      status: "REVOKED" as const,
      fingerprint: "0".repeat(64)
    };

    expect(mandateFingerprint(changedLifecycle)).toBe(first);
  });

  it("detects a direct edit to persisted mandate limits", () => {
    const fingerprint = mandateFingerprint(confirmedMandate);
    const persisted = { ...confirmedMandate, fingerprint };
    const directlyEditedRow = {
      ...persisted,
      period: { ...persisted.period, budget: 10_000 }
    };

    expect(verifyMandateFingerprint(persisted)).toBe(true);
    expect(verifyMandateFingerprint(directlyEditedRow)).toBe(false);
  });

  it("defaults the protection on and only disables for an explicit false flag", () => {
    expect(mandateFingerprintEnabled({})).toBe(true);
    expect(mandateFingerprintEnabled({ FEATURE_MANDATE_FINGERPRINT: "false" })).toBe(false);
    expect(mandateFingerprintEnabled({ FEATURE_MANDATE_FINGERPRINT: "0" })).toBe(true);
  });
});
