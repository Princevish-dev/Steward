import { idempotencyKey } from "@/core/ledger/append";
import { paypalRequest } from "@/core/paypal/client";

export type OrderRequest = {
  runId: string;
  cartHash: string;
  amount: number;
  currency: "USD";
  vaultToken: string;
};

export type PayPalOrderRequest = {
  amount: string;
  currency_code: "USD";
  vaultToken: string;
  idempotencyKey: string;
};

export type PayPalCreatedOrder = {
  id: string;
  status: string;
  links?: Array<{ href: string; rel: string; method: string }>;
  purchase_units?: Array<{ payments?: { captures?: Array<{ id: string }> } }>;
};

export function toPayPalOrderRequest(request: OrderRequest): PayPalOrderRequest {
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error("Payment amount must be a positive finite number.");
  }
  if (!request.vaultToken) {
    throw new Error("A vault token is required for merchant-initiated payment.");
  }
  return {
    amount: request.amount.toFixed(2),
    currency_code: request.currency,
    vaultToken: request.vaultToken,
    idempotencyKey: idempotencyKey(request.runId, request.cartHash)
  };
}

export async function createSandboxOrder(request: OrderRequest): Promise<PayPalCreatedOrder> {
  const order = await paypalRequest<PayPalCreatedOrder>("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": idempotencyKey(request.runId, request.cartHash) },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: request.runId,
        amount: {
          currency_code: request.currency,
          value: request.amount.toFixed(2)
        }
      }],
      application_context: {
        brand_name: "Steward Sandbox",
        user_action: "PAY_NOW",
        return_url: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/paypal/return?runId=${encodeURIComponent(request.runId)}`,
        cancel_url: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/dashboard?paypal=cancelled`
      }
    })
  });
  return order;
}

export async function captureSandboxOrder(orderId: string): Promise<PayPalCreatedOrder> {
  if (!/^[A-Z0-9-]+$/i.test(orderId)) {
    throw new Error("Invalid PayPal order id.");
  }

  return paypalRequest<PayPalCreatedOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": orderId }
  });
}

export async function refundSandboxCapture(
  captureId: string,
  amount?: number
): Promise<{ id: string; status: string; amount?: { value: string; currency_code: string } }> {
  if (!/^[A-Z0-9-]+$/i.test(captureId)) {
    throw new Error("Invalid PayPal capture id.");
  }
  return paypalRequest(`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `refund-${captureId}` },
    body: amount === undefined ? undefined : JSON.stringify({
      amount: { value: amount.toFixed(2), currency_code: "USD" }
    })
  });
}

export async function createVaultOrder(input: {
  runId: string;
  amount: number;
  vaultId: string;
}): Promise<PayPalCreatedOrder> {
  if (!input.vaultId) throw new Error("A PayPal Vault ID is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Payment amount must be positive.");
  return paypalRequest<PayPalCreatedOrder>("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": idempotencyKey(input.runId, input.vaultId) },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: input.runId, amount: { currency_code: "USD", value: input.amount.toFixed(2) } }],
      payment_source: { paypal: { vault_id: input.vaultId } }
    })
  });
}
