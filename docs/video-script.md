# 2:50 demo script

**0:00-0:12 — Hook.** On screen: Steward dashboard and banner. Say: “Steward
gives an AI agent a mandate, not a credit card. Models propose; deterministic
code decides and pays.”

**0:12-0:35 — Create mandate.** Open New mandate. Enter the owner and “Buy
paper and coffee, max 120 dollars monthly, ask above 60.” Show the parsed draft,
then Confirm and the ACTIVE state.

**0:35-1:05 — Normal run.** Run the within-limit scenario. Show all 13 rules,
AUTO APPROVE, the labelled Channel3 fixture/live source, and Create PayPal
Sandbox order. Approve in PayPal Sandbox and capture. Point at the simulated
tracking label.

**1:05-1:30 — Approval.** Run the above-limit scenario. Show ASK HUMAN, open
Approval inbox, approve with keyboard, then show the gated order. Explain that
the browser cannot supply the amount or order ID.

**1:30-1:52 — Red team.** Open Red-team checks and run all five hostile fixtures.
Show the injection/merchant/price/quantity outcomes and the rule evidence. No
payment call is made for BLOCK.

**1:52-2:12 — Proof.** Verify the ledger. Edit the displayed test payload in the
tamper demonstration, verify again, and show INVALID. Restore the page and show
VALID.

**2:12-2:30 — MCP.** From an external MCP client, call
`get_mandate_status` and `propose_purchase` with the mandate-scoped key. Show
the four-tool list and the returned deterministic decision.

**2:30-2:42 — Dispute.** Click the labelled simulated dispute webhook and open
Dispute Advocate. Show “not available” for absent facts and the template fallback
when AI is disabled.

**2:42-2:50 — Close.** Show the banner and ledger. Say: “PayPal Sandbox,
fixture or live catalog, simulated fulfilment, and proof for every state.
Delegation with proof.”

No music. Use only the product interface and permitted PayPal Sandbox screens.
