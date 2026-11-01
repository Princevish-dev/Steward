import type { Mandate } from "@/core/mandate/schema";
import type { Decision } from "@/core/policy/types";

export function mandateStatusDecision(status: Mandate["status"]): { decision: Decision; reason: string } | null {
  if (status === "REVOKED") return { decision: "BLOCK", reason: "MANDATE_REVOKED" };
  if (status !== "ACTIVE") return { decision: "BLOCK", reason: "MANDATE_NOT_ACTIVE" };
  return null;
}
