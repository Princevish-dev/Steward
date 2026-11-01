# Steward

## Tagline

Give an AI agent a mandate, not your credit card.

## Inspiration

Shopping agents can find products quickly, but a natural-language request is not
a spending limit. Steward makes the boundary explicit and auditable.

## What it does

An owner writes a purchasing mandate. Steward drafts it, requires confirmation,
searches a catalog, evaluates 13 deterministic rules, and returns AUTO, ASK, or
BLOCK. Only a persisted server-side Decision can create or capture a PayPal
Sandbox order. Every state change is written to a hash-chained ledger.

## How we built it

PayPal pieces are Orders v2 create, buyer approval, capture, refund, tracking,
webhook signature verification, and dispute event handling. AI tools are a
structured mandate parser, shopper, reviewer, and Dispute Advocate using
`generateObject` and Zod; deterministic fallbacks remain available. Channel3
provides live search when configured and labelled fixtures otherwise. AG Grid
renders the ledger and detail panel. Render supplies deployment and keep-warm
configuration. APIMatic informed the API contract workflow. Postman collection
files provide repeatable API checks.

## Challenges

The difficult part was separating useful model explanations from authorization.
The model may escalate caution but cannot relax a deterministic decision.

## Accomplishments

The demo shows mandate lifecycle, approval inbox, blocked hostile product text,
PayPal Sandbox gating, ledger verification, MCP tools, and a dispute evidence
draft.

## What we learned

Idempotency must be designed at the database boundary, not added to a button.
Fixture labels and simulated fulfilment labels are essential for an honest demo.

## What's next

Use a shared rate-limit store, finish production shipment integrations, and
revisit Vault only after setup-token permissions are verified end to end.

## Testing instructions

Run `npm ci`, configure `.env.local`, run `npm run db:migrate`, then
`npm run typecheck`, `npm run lint`, `npm test`, and `npm run e2e`. The UI's
Demo login seeds an owner and active mandate.

## Honesty note

This submission is PayPal Sandbox only. Channel3 is live only when its key and
URL are configured; otherwise the UI says fixture. Shipment fulfilment and the
carrier are simulated. Live AI proof requires provider credentials and is not
claimed when those credentials are absent.
