# Steward threat model

| Asset | Threat | Control |
|---|---|---|
| PayPal funds | Prompt injection or cart manipulation | Product text is sanitized; the 13 deterministic rules and server-side persisted Decision gate payment |
| Mandates | Cross-owner access | Signed httpOnly session cookie, ownership checks, and mandate-scoped MCP key |
| Ledger | Deletion or mutation | Append-only database table and SHA-256 `prevHash` chain with an explicit verify endpoint |
| Webhooks | Forged or replayed events | PayPal `verify-webhook-signature` call and unique event-id claim |
| API capacity | Abuse and denial of service | In-memory rate limits on demo, runs, red-team, and key creation routes |
| Secrets | Repository or client exposure | Environment-only credentials, no browser exposure, and production `SESSION_SECRET` requirement |

Known limitations: the rate limiter is process-local, fulfilment is simulated,
and this release supports PayPal Sandbox only. A production deployment should
use a shared rate-limit store and operational secret scanning.
