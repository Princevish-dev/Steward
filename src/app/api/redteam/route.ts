import { NextResponse } from "next/server";
import { redTeamFixtures, quarantineProductText } from "@/core/agents/redteam";
import { buildScenarioCart } from "@/core/agents/shopper";
import { createDemoMandate } from "@/core/mandate/parser";
import { createMandate, getPurchaseHistory, persistRun, setMandateStatus } from "@/core/domain/store";
import { evaluatePolicy, combineDecisions } from "@/core/policy/engine";
import { cartHash } from "@/core/payment/cart-hash";
import { rateLimit } from "@/core/http/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "redteam");
  if (limited) return limited;
  const body = await request.json().catch(() => null) as { fixtureId?: unknown } | null;
  const fixture = redTeamFixtures.find((item) => item.id === body?.fixtureId);
  if (!fixture) return NextResponse.json({ error: "Unknown red-team fixture." }, { status: 422 });
  try {
    const base = createDemoMandate("redteam@example.com", "Red-team fixture evaluation; max $120 a month; nothing over $40; ask me above $60.");
    await createMandate(base);
    const active = await setMandateStatus(base.id, "ACTIVE");
    if (!active) throw new Error("Red-team mandate activation failed.");
    const scenario = fixture.id === "price-drift" ? "ask" : fixture.id === "quantity-escalation" ? "over-cap" : "hostile";
    const mandate = fixture.id === "deny-listed-merchant"
      ? { ...active, merchants: { ...active.merchants, deny: ["untrusted-market.example"] } }
      : active;
    const shopper = buildScenarioCart(scenario, mandate);
    const sanitized = quarantineProductText(fixture.attack);
    const policy = evaluatePolicy({
      mandate,
      cart: shopper.cart,
      history: await getPurchaseHistory(mandate.id),
      safetyFlags: shopper.flags.map((flag) => flag.code)
    });
    const decision = combineDecisions(policy.decision, "ASK");
    const runId = `run_redteam_${crypto.randomUUID()}`;
    await persistRun({
      runId,
      mandate,
      task: fixture.attack,
      decision,
      cart: shopper.cart,
      policy: { ...policy, decision },
      cartHash: cartHash({
        mandateId: mandate.id,
        currency: mandate.currency,
        items: shopper.cart.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
      })
    });
    return NextResponse.json({
      fixture,
      runId,
      decision,
      sanitized,
      timeline: [
        "Channel3 fixture fetched",
        sanitized.flagged ? "Untrusted instructions quarantined" : "Product text sanitized",
        "Deterministic policy evaluated all 13 rules",
        "Reviewer can only escalate severity",
        `Final decision: ${decision}`
      ],
      ruleResults: policy.ruleResults
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Red-team run failed." }, { status: 500 });
  }
}
