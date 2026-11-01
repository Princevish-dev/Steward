export type PaymentApproval = {
  status: string;
  expiresAt: Date | string | null;
};

export function assertPaymentAllowed(input: {
  decision: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK" | "REVOKED";
  approval: PaymentApproval | null;
  now: Date;
}): void {
  if (input.decision === "REVOKED" || input.decision === "BLOCK") {
    throw new Error(input.decision === "REVOKED" ? "MANDATE_REVOKED" : "PAYMENT_BLOCKED");
  }
  if (input.decision === "AUTO_APPROVE") return;
  if (
    input.decision !== "ASK_HUMAN" ||
    !input.approval ||
    input.approval.status !== "APPROVED" ||
    (input.approval.expiresAt !== null && new Date(input.approval.expiresAt) <= input.now)
  ) {
    throw new Error("APPROVAL_REQUIRED");
  }
}
