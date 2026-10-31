import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createDemoMandate } from "@/core/mandate/parser";
import { buildCartFromTask } from "@/core/agents/shopper";
import { evaluatePolicy } from "@/core/policy/engine";
import type { PurchaseHistory } from "@/core/policy/types";
import { persistRun, createApproval } from "@/core/domain/store";

const demoHistory: PurchaseHistory = {
  spentInPeriod: 0,
  autoPurchasesLast24h: 0,
  merchantsPurchasedUnderMandate: ["paper-co.example", "coffee-market.example"]
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { task, owner } = body as { task?: unknown; owner?: unknown };
  if (typeof task !== "string" || !task.trim() || typeof owner !== "string" || !owner.trim()) {
    return NextResponse.json({ error: "task and owner are required." }, { status: 422 });
  }

  try {
    const mandate = createDemoMandate(owner, task);
    const shopper = buildCartFromTask(task, mandate);
    const policy = evaluatePolicy({
      mandate,
      cart: shopper.cart,
      history: demoHistory
    });
    const cartHash = createHash("sha256").update(JSON.stringify(shopper.cart)).digest("hex");

    const runId = `run_${crypto.randomUUID()}`;
    await persistRun({
      runId,
      mandate,
      task,
      decision: policy.decision,
      cart: shopper.cart,
      policy
    });
    if (policy.decision === "ASK_HUMAN") {
      await createApproval(runId, policy.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.reason).join("; "));
    }

    return NextResponse.json({
      runId,
      mandateId: mandate.id,
      decision: policy.decision,
      cartHash,
      cart: shopper.cart,
      flags: shopper.flags,
      total: policy.total,
      ruleResults: policy.ruleResults,
      paymentAttempted: false
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
