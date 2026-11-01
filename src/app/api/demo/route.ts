import { NextResponse } from "next/server";
import { createDemoMandate } from "@/core/mandate/parser";
import { createMandate, getPurchaseHistory, persistRun, setMandateStatus } from "@/core/domain/store";
import { buildScenarioCart } from "@/core/agents/shopper";
import { evaluatePolicy } from "@/core/policy/engine";
import { cartHash } from "@/core/payment/cart-hash";
import { createSessionToken, sessionCookie } from "@/core/auth/session";
import { rateLimit } from "@/core/http/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "demo", 10);
  if (limited) return limited;
  const body = await request.json().catch(() => null) as { owner?: unknown } | null;
  const owner = typeof body?.owner === "string" && body.owner.includes("@")
    ? body.owner
    : "judge@example.com";
  try {
    const mandate = createDemoMandate(owner, "Buy office paper and coffee for the studio; max $120 a month; nothing over $40 per item; ask me above $60.");
    await createMandate(mandate);
    const active = await setMandateStatus(mandate.id, "ACTIVE");
    if (!active) throw new Error("Demo mandate activation failed.");
    const history = await getPurchaseHistory(mandate.id);
    for (const scenario of ["within", "ask"] as const) {
      const shopper = buildScenarioCart(scenario, active);
      const policy = evaluatePolicy({ mandate: active, cart: shopper.cart, history, safetyFlags: shopper.flags.map((flag) => flag.code) });
      await persistRun({
        runId: `run_demo_${scenario}_${crypto.randomUUID()}`,
        mandate: active,
        task: scenario === "within" ? "A4 printer paper" : "A4 printer paper and coffee",
        decision: policy.decision,
        cart: shopper.cart,
        policy,
        cartHash: cartHash({
          mandateId: active.id,
          currency: active.currency,
          items: shopper.cart.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
        })
      });
    }
    const response = NextResponse.json({ mandate: active, seeded: true });
    response.cookies.set(sessionCookie(createSessionToken(owner)));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Demo seed failed." }, { status: 500 });
  }
}
