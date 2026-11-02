# ADR 0006: Require typed step-up confirmation for approvals and refunds

## Status

Accepted for the approval and full-capture refund endpoints.

## Decision

With `FEATURE_TYPED_CONFIRM` enabled (default), Steward issues a DB-backed one-time nonce bound to an owner and pending action. Challenges expire after five minutes and permit at most five attempts. Approval and refund amounts are read from persisted cart or payment records on the server; the caller cannot choose the amount. The owner must type the exact `CONFIRM $<amount>` phrase. Confirmation is consumed transactionally and recorded as `APPROVAL_CONFIRMED` or `REFUND_CONFIRMED` before the action proceeds.

## Consequences

- A challenge can only be issued for an owner-scoped pending approval or captured order.
- A wrong phrase increments the attempt count; the fifth failure invalidates the challenge.
- This implementation covers full-capture refunds. Partial refunds and user-interface initiated refunds are not supported.
- Explicitly setting the feature flag to `false` disables the step-up requirement for rollback.
