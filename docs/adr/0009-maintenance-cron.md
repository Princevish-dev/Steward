# ADR 0009: Run owner-independent expiry through a secret cron endpoint

## Status

Accepted for pending approval expiry. Hold cleanup will be added with the authorization-hold flow.

## Decision

The Render cron service calls `POST /api/cron/maintenance` every ten minutes with `x-cron-secret`. The route rejects missing or invalid secrets before database access. Maintenance expires pending approvals past their deadline and writes one `APPROVAL_EXPIRED` ledger event per row. The endpoint also performs the health request's keep-warm role by being the cron target.

## Consequences

- `CRON_SECRET` must be configured on the web and cron services.
- A failed run exits nonzero so Render can report the cron failure.
- Stale authorization holds are not present yet and therefore are not processed.
