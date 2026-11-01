import type { Mandate } from "@/core/mandate/schema";

export type Decision = "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK";
export type Category =
  | "office_supplies"
  | "coffee_tea"
  | "groceries_pantry"
  | "electronics_accessories"
  | "books"
  | "cleaning_supplies"
  | "other";

export type CartItem = {
  productId: string;
  title: string;
  merchant: string;
  category: Category;
  unitPrice: number;
  quotedUnitPrice?: number;
  quantity: number;
  currency: string;
  stockConfirmedAt: string;
};

export type Cart = {
  items: CartItem[];
};

export type PurchaseHistory = {
  spentInPeriod: number;
  autoPurchasesLast24h: number;
  merchantsPurchasedUnderMandate: string[];
};

export type RuleResult = {
  id: `R${string}`;
  passed: boolean;
  outcome: Decision | null;
  reason: string;
};

export type PolicyResult = {
  decision: Decision;
  ruleResults: RuleResult[];
  total: number;
};

export type ReviewerDecision = "AUTO" | "ASK" | "BLOCK";

export type PolicyInput = {
  mandate: Mandate;
  cart: Cart;
  history: PurchaseHistory;
  safetyFlags?: string[];
  now?: Date;
};
