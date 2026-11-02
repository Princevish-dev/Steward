# ADR 0008: Keep AI and payment code in separate dependency layers

## Status

Accepted.

## Decision

The AI client, agents, mandate parser, and Ask feature may not import PayPal provider modules, payment services, or domain persistence/write functions. AI returns proposals and explanations; route handlers and deterministic policy/domain services own state changes and payment decisions. ESLint `no-restricted-imports` enforces the import boundary, and `tests/architecture-boundary.test.ts` scans static, dynamic, and CommonJS imports for the same forbidden dependencies.

## Consequences

The architecture test is part of the normal Vitest suite, so CI fails if a forbidden dependency is introduced. New AI areas must be added to the scanner and lint override when created. The check is intentionally conservative: importing the domain store is prohibited even when a caller intends to use only a read function.
