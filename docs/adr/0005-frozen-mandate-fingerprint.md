# ADR 0005: Freeze confirmed mandate definitions

## Status

Accepted for the Steward release branch.

## Decision

When a mandate is confirmed, Steward stores a SHA-256 fingerprint over its canonical JSON definition and records that fingerprint in `MANDATE_CONFIRMED`. Lifecycle status and the stored fingerprint field are excluded from the hash; mandate version and prior-version reference remain included. Every run verifies the persisted definition before invoking shopper, history, or AI work. A missing or mismatched fingerprint produces `BLOCK` with `MANDATE_TAMPERED` and no payment attempt.

Confirmed definitions are immutable through the application. Owners amend them by creating a new DRAFT version, editing that draft, and confirming it independently. The `FEATURE_MANDATE_FINGERPRINT` flag defaults on; an explicit `false` disables enforcement for controlled rollback.

## Consequences

- A direct database edit to a confirmed definition is detected before a run proceeds.
- The ledger provides the confirmation fingerprint and tamper evidence.
- Fingerprints detect edits but do not replace database access controls or ledger-chain verification.
- Deployments with the flag disabled temporarily lose this invariant and should restore it promptly.

## Verification

Automated tests cover canonical stability, direct definition edits, run blocking, confirmation ledger payload, amendment versioning, and draft edit persistence.
