# Steward architecture

```mermaid
flowchart LR
  UI[Dashboard / MCP client] --> API[Next.js route handlers]
  API --> AUTH[Session or mandate API key]
  API --> SHOP[Shopper and Channel3]
  SHOP --> POLICY[13-rule deterministic policy]
  POLICY --> REVIEW[Optional AI reviewer]
  REVIEW --> DECISION[Persisted Decision]
  DECISION --> GATE[Server payment guard]
  GATE --> PAYPAL[PayPal Sandbox]
  API --> LEDGER[SHA-256 chained ledger]
  PAYPAL --> WEBHOOK[Verified webhook]
  WEBHOOK --> LEDGER
```

```mermaid
sequenceDiagram
  participant Owner
  participant Steward
  participant PayPal
  Owner->>Steward: Draft mandate from natural language
  Owner->>Steward: Confirm mandate
  Steward->>Steward: Evaluate cart and persist Decision
  Steward->>PayPal: Create order only after guard
  Owner->>PayPal: Approve in Sandbox
  Steward->>PayPal: Capture persisted order
  Steward->>Steward: Append capture and simulated tracking events
```

The model proposes structured data and explanations. The policy engine, persisted
decision, ownership checks, and payment guard decide whether money can move.
Product descriptions are untrusted input. PayPal credentials and amounts never
come from an LLM response or browser request.
