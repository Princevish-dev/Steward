export type ReconciliationStatus = "RECONCILED" | "MISMATCH";

export function paypalReconciliationEnabled(env: { FEATURE_RECONCILE?: string } = process.env as { FEATURE_RECONCILE?: string }): boolean {
  return env.FEATURE_RECONCILE?.trim().toLowerCase() !== "false";
}

type PayPalAmount = { value?: unknown; currency_code?: unknown };
type PayPalCapture = { id?: unknown; status?: unknown; amount?: PayPalAmount };

export type PayPalOrderWitness = {
  id?: unknown;
  status?: unknown;
  purchase_units?: Array<{
    amount?: PayPalAmount;
    payments?: { captures?: PayPalCapture[] };
  }>;
};

export type PayPalRefundWitness = {
  id?: unknown;
  status?: unknown;
  amount?: PayPalAmount;
};

export type ReconciliationResult = {
  status: ReconciliationStatus;
  mismatches: string[];
  observed: { id: string | null; amount: number | null; currency: string | null; status: string | null };
};

function amount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function equalMoney(left: number | null, right: number): boolean {
  return left !== null && Math.abs(left - right) < 0.005;
}

function finish(observed: ReconciliationResult["observed"], mismatches: string[]): ReconciliationResult {
  return { status: mismatches.length === 0 ? "RECONCILED" : "MISMATCH", mismatches, observed };
}

export function comparePayPalOrder(
  remote: PayPalOrderWitness,
  local: { id: string; amount: number; currency: string; status: string; captureId?: string | null }
): ReconciliationResult {
  const unit = remote.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const remoteAmount = amount(unit?.amount?.value ?? capture?.amount?.value);
  const remoteCurrency = String(unit?.amount?.currency_code ?? capture?.amount?.currency_code ?? "").toUpperCase() || null;
  const remoteStatus = String(remote.status ?? capture?.status ?? "").toUpperCase() || null;
  const observed = { id: typeof remote.id === "string" ? remote.id : null, amount: remoteAmount, currency: remoteCurrency, status: remoteStatus };
  const mismatches: string[] = [];

  if (observed.id !== local.id) mismatches.push("id");
  if (!equalMoney(remoteAmount, local.amount)) mismatches.push("amount");
  if (remoteCurrency !== local.currency.toUpperCase()) mismatches.push("currency");
  const expectedStatus = local.status === "PAID" || local.status === "COMPLETED" ? "COMPLETED" : local.status.toUpperCase();
  if (remoteStatus !== expectedStatus) mismatches.push("status");
  if (local.captureId && capture?.id !== local.captureId) mismatches.push("captureId");
  return finish(observed, mismatches);
}

export function comparePayPalRefund(
  remote: PayPalRefundWitness,
  local: { id: string; amount: number; currency: string; status: string }
): ReconciliationResult {
  const remoteAmount = amount(remote.amount?.value);
  const remoteCurrency = String(remote.amount?.currency_code ?? "").toUpperCase() || null;
  const remoteStatus = String(remote.status ?? "").toUpperCase() || null;
  const observed = { id: typeof remote.id === "string" ? remote.id : null, amount: remoteAmount, currency: remoteCurrency, status: remoteStatus };
  const mismatches: string[] = [];

  if (observed.id !== local.id) mismatches.push("id");
  if (!equalMoney(remoteAmount, local.amount)) mismatches.push("amount");
  if (remoteCurrency !== local.currency.toUpperCase()) mismatches.push("currency");
  const expectedStatus = local.status.toUpperCase() === "REFUNDED" ? "COMPLETED" : local.status.toUpperCase();
  if (remoteStatus !== expectedStatus) mismatches.push("status");
  return finish(observed, mismatches);
}
