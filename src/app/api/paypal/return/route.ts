import { NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/core/http/public-url";
import { captureSandboxOrder, getSandboxOrder } from "@/core/paypal/orders";
import { comparePayPalOrder, paypalReconciliationEnabled } from "@/core/paypal/reconcile";
import { getRunContext, getRunContextByOrderId, markOrderCaptured, persistPayPalReconciliation, persistTracking } from "@/core/domain/store";
import { addShipmentTracking } from "@/core/paypal/tracking";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const token = query.get("token"); // PayPal Order ID
  const runIdParam = query.get("runId");
  const mandateIdParam = query.get("mandateId");
  const baseUrl = getPublicBaseUrl(request);

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?paypal=missing-token${mandateIdParam ? `&mandateId=${encodeURIComponent(mandateIdParam)}` : ""}`
    );
  }

  try {
    // 1. Resolve run context either from runIdParam or by looking up orderId in DB
    let context = runIdParam ? await getRunContext(runIdParam) : null;
    if (!context) {
      context = await getRunContextByOrderId(token);
    }
    const runId = context?.id ?? runIdParam;
    const mandateId = context?.mandate_id ?? mandateIdParam;

    // 2. If already captured/paid, redirect with success (idempotent)
    if (context && (context.order_status === "PAID" || context.order_status === "COMPLETED")) {
      if (context.reconciliation_status === "MISMATCH") {
        throw new Error("PAYPAL_RECONCILIATION_MISMATCH");
      }
      if (paypalReconciliationEnabled() && context.reconciliation_status !== "RECONCILED") {
        const witness = await getSandboxOrder(token);
        const reconciliation = comparePayPalOrder(witness, {
          id: token,
          amount: Number(context.amount ?? 0),
          currency: String(context.currency ?? "USD"),
          status: "PAID",
          captureId: context.capture_id
        });
        const persisted = await persistPayPalReconciliation({ kind: "ORDER", orderId: token, runId: context.id, mandateId: context.mandate_id, ...reconciliation });
        if (persisted.status === "MISMATCH") throw new Error("PAYPAL_RECONCILIATION_MISMATCH");
      }
      return NextResponse.redirect(
        `${baseUrl}/dashboard?paypal=captured&orderId=${encodeURIComponent(token)}&captureId=${encodeURIComponent(context.capture_id ?? "")}${mandateId ? `&mandateId=${encodeURIComponent(mandateId)}` : ""}`
      );
    }

    // 3. Buyer has approved in PayPal Sandbox; capture the payment now
    const order = await captureSandboxOrder(token);
    const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const amount = (context?.cart as { items?: Array<{ unitPrice: number; quantity: number }> })?.items?.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ) ?? 0;

    // 4. Update order status to PAID and append ORDER_CAPTURED event to SHA-256 ledger
    if (runId) {
      await markOrderCaptured(runId, captureId, amount);
      if (paypalReconciliationEnabled()) {
        const reconciliation = comparePayPalOrder(order, {
          id: token,
          amount,
          currency: String(context?.currency ?? "USD"),
          status: "PAID",
          captureId
        });
        const persisted = await persistPayPalReconciliation({ kind: "ORDER", orderId: token, runId, mandateId: context?.mandate_id ?? mandateId ?? "unknown", ...reconciliation });
        if (persisted.status === "MISMATCH") throw new Error("PAYPAL_RECONCILIATION_MISMATCH");
      }
      const tracking = await addShipmentTracking(token, runId);
      await persistTracking(runId, tracking);
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard?paypal=captured&orderId=${encodeURIComponent(token)}&captureId=${encodeURIComponent(captureId ?? "")}${mandateId ? `&mandateId=${encodeURIComponent(mandateId)}` : ""}`
    );
  } catch (err) {
    console.error("PayPal return capture error:", err);
    const message = err instanceof Error ? err.message : "PayPal capture failed on return.";
    return NextResponse.redirect(
      `${baseUrl}/dashboard?paypal=error&orderId=${encodeURIComponent(token)}&message=${encodeURIComponent(message)}${mandateIdParam ? `&mandateId=${encodeURIComponent(mandateIdParam)}` : ""}`
    );
  }
}
