import type {
  Cart,
  Decision,
  PolicyInput,
  PolicyResult,
  ReviewerDecision,
  RuleResult
} from "@/core/policy/types";

const severity: Record<Decision, number> = {
  AUTO_APPROVE: 0,
  ASK_HUMAN: 1,
  BLOCK: 2
};

const reviewerToDecision: Record<ReviewerDecision, Decision> = {
  AUTO: "AUTO_APPROVE",
  ASK: "ASK_HUMAN",
  BLOCK: "BLOCK"
};

function rule(
  id: RuleResult["id"],
  passed: boolean,
  outcome: Decision | null,
  reason: string
): RuleResult {
  return { id, passed, outcome, reason };
}

function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function evaluatePolicy({
  mandate,
  cart,
  history,
  safetyFlags = [],
  now = new Date()
}: PolicyInput): PolicyResult {
  const total = cartTotal(cart);
  const nowMs = now.getTime();
  const expiresMs = new Date(mandate.expiresAt).getTime();
  const rules: RuleResult[] = [
    rule(
      "R01",
      mandate.status === "ACTIVE" && expiresMs > nowMs,
      "BLOCK",
      mandate.status === "ACTIVE" && expiresMs > nowMs ? "Mandate is active." : "Mandate is inactive or expired."
    ),
    rule(
      "R02",
      safetyFlags.length === 0 && cart.items.every(
        (item) =>
          !mandate.merchants.deny.includes(item.merchant) &&
          (mandate.merchants.allow.length === 0 || mandate.merchants.allow.includes(item.merchant))
      ),
      "BLOCK",
      safetyFlags.length === 0
        ? "Merchant allow and deny lists were checked."
        : "Untrusted product instructions were quarantined."
    ),
    rule(
      "R03",
      cart.items.every((item) => mandate.categories.includes(item.category)),
      "BLOCK",
      "All item categories are within the mandate."
    ),
    rule(
      "R04",
      mandate.caps.perItem === null ||
        cart.items.every((item) => item.unitPrice <= mandate.caps.perItem!),
      "BLOCK",
      "Every item is within the per-item cap."
    ),
    rule(
      "R05",
      mandate.caps.perTransaction === null || total <= mandate.caps.perTransaction,
      "BLOCK",
      "The cart is within the transaction cap."
    ),
    rule(
      "R06",
      history.spentInPeriod + total <= mandate.period.budget,
      "BLOCK",
      "The purchase remains within the period budget."
    ),
    rule(
      "R07",
      mandate.askAbove === null || total <= mandate.askAbove,
      "ASK_HUMAN",
      mandate.askAbove === null || total <= mandate.askAbove ? "The approval threshold was not exceeded." : "The approval threshold was exceeded."
    ),
    rule(
      "R08",
      cart.items.every(
        (item) =>
          item.quotedUnitPrice === undefined ||
          Math.abs(item.unitPrice - item.quotedUnitPrice) / item.quotedUnitPrice <= 0.05
      ),
      "ASK_HUMAN",
      "Quoted and current prices were compared."
    ),
    rule(
      "R09",
      cart.items.every((item) => nowMs - new Date(item.stockConfirmedAt).getTime() <= 10 * 60 * 1000),
      "ASK_HUMAN",
      "Stock confirmation freshness was checked."
    ),
    rule(
      "R10",
      history.autoPurchasesLast24h < mandate.velocity.maxAutoPurchasesPer24h,
      "ASK_HUMAN",
      "Recent automatic purchase velocity was checked."
    ),
    rule(
      "R11",
      history.merchantsPurchasedUnderMandate.length === 0 ||
        cart.items.every((item) => history.merchantsPurchasedUnderMandate.includes(item.merchant)),
      "ASK_HUMAN",
      "Merchant purchase history was checked."
    ),
    rule(
      "R12",
      cart.items.every((item) => item.quantity <= mandate.caps.maxQuantityPerItem),
      "BLOCK",
      "Item quantities are within the mandate."
    ),
    rule(
      "R13",
      cart.items.every((item) => item.currency === "USD"),
      "BLOCK",
      "All cart items use USD."
    )
  ];

  const decision = rules.some((result) => !result.passed && result.outcome === "BLOCK")
    ? "BLOCK"
    : rules.some((result) => !result.passed && result.outcome === "ASK_HUMAN")
      ? "ASK_HUMAN"
      : "AUTO_APPROVE";

  return { decision, ruleResults: rules, total };
}

export function combineDecisions(policyDecision: Decision, reviewerDecision: ReviewerDecision): Decision {
  const reviewer = reviewerToDecision[reviewerDecision];
  return severity[reviewer] > severity[policyDecision] ? reviewer : policyDecision;
}
