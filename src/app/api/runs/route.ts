import { NextResponse } from "next/server";
import { buildCartFromTask, buildScenarioCart, buildCartWithAi, buildCartFromTaskWithChannel3 } from "@/core/agents/shopper";
import { evaluatePolicy } from "@/core/policy/engine";
import type { PurchaseHistory } from "@/core/policy/types";
import { getMandate, persistRun, createApproval, getPurchaseHistory } from "@/core/domain/store";
import { cartHash } from "@/core/payment/cart-hash";
import { mandateStatusDecision } from "@/core/mandate/lifecycle";
import { reviewPurchase } from "@/core/policy/reviewer";
import { useLlm } from "@/core/ai/client";
import { recordLedgerEvent } from "@/core/ledger/store";
import { requireSessionOwner, ownsMandate } from "@/core/auth/session";
import { rateLimit } from "@/core/http/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "runs");
  if (limited) return limited;
  let sessionOwner: string;
  try { sessionOwner = requireSessionOwner(request); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { task, mandateId, scenario } = body as {
    task?: unknown;
    mandateId?: unknown;
    scenario?: unknown;
  };
  if (typeof task !== "string" || !task.trim() || typeof mandateId !== "string" || !mandateId.trim()) {
    return NextResponse.json({ error: "task and mandateId are required." }, { status: 422 });
  }

  try {
    const mandate = await getMandate(mandateId);
    if (!mandate) return NextResponse.json({ error: "Mandate not found." }, { status: 404 });
    if (!ownsMandate(sessionOwner, mandate.owner)) return NextResponse.json({ error: "Mandate access denied." }, { status: 403 });
    const validScenario = scenario === "within" || scenario === "ask" || scenario === "over-cap" || scenario === "hostile";
    const shopper = validScenario
      ? buildScenarioCart(scenario, mandate)
      : (useLlm
        ? await buildCartWithAi(task, mandate)
        : process.env.CHANNEL3_API_KEY
          ? await buildCartFromTaskWithChannel3(task, mandate)
          : buildCartFromTask(task, mandate));
    const history: PurchaseHistory = await getPurchaseHistory(mandate.id);
    const inactive = mandateStatusDecision(mandate.status);
    const policy = inactive
      ? {
          decision: inactive.decision,
          total: shopper.cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
          ruleResults: evaluatePolicy({ mandate: { ...mandate, status: "ACTIVE" }, cart: shopper.cart, history }).ruleResults.map((rule) =>
            rule.id === "R01" ? { ...rule, passed: false, reason: inactive.reason } : rule
          )
        }
      : evaluatePolicy({
        mandate,
        cart: shopper.cart,
        history,
        safetyFlags: shopper.flags.map((flag) => flag.code)
      });
    let finalDecision = policy.decision;
    let reviewer: Awaited<ReturnType<typeof reviewPurchase>> | undefined;
    if (useLlm && !inactive) {
      reviewer = await reviewPurchase({
        mandate,
        cart: shopper.cart,
        policyDecision: policy.decision,
        ruleResults: policy.ruleResults,
        flags: shopper.flags.map((flag) => flag.code),
        history
      });
      finalDecision = reviewer.decision;
    }
    const persistedPolicy = {
      ...policy,
      decision: finalDecision,
      ai: {
        shopper: shopper.ai,
        reviewer: reviewer?.ai,
        source: shopper.source ?? "fallback",
        reasoning: shopper.reasoning,
        reviewerRationale: reviewer?.rationale
      }
    };
    const computedCartHash = cartHash({
      mandateId: mandate.id,
      currency: mandate.currency,
      items: shopper.cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
    const runId = `run_${crypto.randomUUID()}`;

    await persistRun({
      runId,
      mandate,
      task,
      decision: finalDecision,
      cart: shopper.cart,
      policy: persistedPolicy,
      cartHash: computedCartHash
    });
    if (shopper.ai) {
      await recordLedgerEvent({
        type: "AI_CALL",
        runId,
        mandateId: mandate.id,
        payload: { stage: "shopper", ...shopper.ai }
      });
    }
    if (reviewer?.ai) {
      await recordLedgerEvent({
        type: "AI_CALL",
        runId,
        mandateId: mandate.id,
        payload: { stage: "reviewer", ...reviewer.ai }
      });
    }
    if (finalDecision === "ASK_HUMAN") {
      await createApproval(runId, policy.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.reason).join("; "));
    }

    return NextResponse.json({
      runId,
      mandateId: mandate.id,
      decision: finalDecision,
      cartHash: computedCartHash,
      cart: shopper.cart,
      flags: shopper.flags,
      catalogSource: shopper.catalogSource ?? "fixture",
      total: policy.total,
      ruleResults: policy.ruleResults,
      ai: persistedPolicy.ai,
      reviewer: reviewer ? { rationale: reviewer.rationale, riskFlags: reviewer.riskFlags, source: reviewer.source } : null,
      paymentAttempted: false
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
