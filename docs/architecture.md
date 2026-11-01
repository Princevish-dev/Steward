# Steward Architecture Specification

Steward is an autonomous procurement platform governed by explicit human mandates, a 13-rule deterministic policy engine, and a tamper-evident cryptographic audit ledger.

---

## 1. System Overview

```mermaid
flowchart TD
    User([Buyer / Owner]) -->|Natural Language Prompt| Parser[AI Mandate Parser A1]
    Parser --> Draft[Reviewable Mandate Draft]
    User -->|Customizes & Confirms| Mandate[(Active Mandate in Neon DB)]
    
    subgraph Execution Loop
        ExternalAgent([External MCP Agent]) -->|Propose Purchase| MCP[/api/mcp - Mandate Scoped Tool/]
        User -->|Run Scenario| Dashboard[/dashboard UI/]
        
        Dashboard & MCP --> Discovery[Channel3 / Fixture Product Discovery]
        Discovery --> Cart[Proposed Typed Cart]
        Cart --> Engine[13-Rule Deterministic Policy Engine]
        Engine --> RiskAI[AI Risk Reviewer A3]
        
        RiskAI --> DecisionStore[(Persisted Policy Decision)]
    end
    
    subgraph Settlement & Payment Guard
        DecisionStore --> Gate{Server Payment Guard}
        Gate -->|AUTO_APPROVE| OrderAPI[PayPal Orders API v2]
        Gate -->|ASK_HUMAN| Inbox[Approval Inbox]
        Inbox -->|Human Approves| OrderAPI
        Gate -->|BLOCK| Halt[Payment Blocked]
        
        OrderAPI --> PayPalCheckout[PayPal Sandbox Buyer Approval]
        PayPalCheckout --> CaptureAPI[PayPal Capture API]
        CaptureAPI --> RefundAPI[PayPal Sandbox Refund API]
    end
    
    subgraph Cryptographic Audit Trail
        Mandate -.-> Ledger[(SHA-256 Hash-Chained Ledger)]
        DecisionStore -.-> Ledger
        OrderAPI -.-> Ledger
        CaptureAPI -.-> Ledger
        RefundAPI -.-> Ledger
        Webhooks[/api/paypal/webhook/] -.->|Verified Signature| Ledger
    end
```

---

## 2. Purchasing Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Human Owner
    participant Web as Steward Web UI
    participant API as Next.js API Routes
    participant Policy as Deterministic Policy Engine
    participant DB as Neon PostgreSQL
    participant PP as PayPal Sandbox API
    
    Owner->>Web: Input purchasing intent (e.g. "Paper & coffee, max $120/mo, ask >$60")
    Web->>API: POST /api/mandates/draft
    API-->>Web: Structured draft (budget: $120, perItem: $40, askAbove: $60)
    Owner->>Web: Confirm mandate
    Web->>API: POST /api/mandates + /confirm
    API->>DB: Persist Mandate (status: ACTIVE)
    API->>DB: Append MANDATE_CONFIRMED to Ledger
    
    Owner->>Web: Select Scenario & Click "Run Steward"
    Web->>API: POST /api/runs
    API->>Policy: Evaluate 13 rules against Cart + Purchase History
    Policy-->>API: Decision (AUTO_APPROVE / ASK_HUMAN / BLOCK)
    API->>DB: Persist Run + Cart Hash + Decision
    API->>DB: Append POLICY_EVALUATED to Ledger
    
    alt Decision is AUTO_APPROVE
        Owner->>Web: Click "Create PayPal Sandbox Order"
        Web->>API: POST /api/paypal/orders
        API->>Policy: Payment Guard Check (verifies stored decision)
        API->>PP: POST /v2/checkout/orders
        PP-->>API: Order Created + Approval URL
        API-->>Web: Approval URL
        Owner->>PP: Log in & Approve order in PayPal Sandbox
        PP-->>Web: Redirect back (/dashboard?paypal=approved&orderId=...)
        Owner->>Web: Click "Capture approved payment"
        Web->>API: POST /api/paypal/capture
        API->>PP: POST /v2/checkout/orders/{id}/capture
        PP-->>API: Capture Complete (status: COMPLETED)
        API->>DB: Append ORDER_CAPTURED to Ledger
        API-->>Web: Capture confirmed + Ledger sequence #
    else Decision is ASK_HUMAN
        API->>DB: Create Approval Request (status: PENDING, 30m TTL)
        Owner->>Web: Review in Approval Inbox
        Owner->>Web: Click "Approve"
        Web->>API: PATCH /api/approvals (status: APPROVED)
        API->>PP: Create Gated Order via PayPal API
    else Decision is BLOCK
        API-->>Web: Spending Blocked (no PayPal API order can be created)
    end
```

---

## 3. Core Architectural Principles

### 1. Model Proposes, Deterministic Engine Decides
- The AI agents (Mandate Parser `A1`, Shopper Agent `A2`, Risk Reviewer `A3`, Dispute Advocate `A4`) generate structured proposals.
- **The AI cannot authorize spending or lower severity.** If the deterministic policy returns `BLOCK`, an AI reviewer saying "approve" is strictly ignored. The engine can only escalate severity (`AUTO` &rarr; `ASK_HUMAN`), never downgrade.

### 2. Server-Side Payment Guard
- PayPal orders are never created directly from client parameters.
- `/api/paypal/orders` verifies:
  1. Mandate exists and is in `ACTIVE` status (not revoked or expired).
  2. Stored `decision` is either `AUTO_APPROVE` or an unexpired `APPROVED` human review.
  3. The cart hash matches the exact items evaluated by the policy engine.
  4. The currency is strictly `USD`.

### 3. Cryptographic Audit Trail (SHA-256 Ledger)
Every event in the lifecycle is hashed into an immutable chain:
$$\text{entryHash}_n = \text{SHA-256}(\text{sequence} \mathbin{\Vert} \text{timestamp} \mathbin{\Vert} \text{prevHash} \mathbin{\Vert} \text{mandateId} \mathbin{\Vert} \text{type} \mathbin{\Vert} \text{canonicalJson}(\text{payload}))$$
Any modification to past entries breaks subsequent hashes, detectable by `/api/ledger/verify`.

---

## 4. API Routes Reference

| Route | Method | Auth / Protection | Purpose |
|---|---|---|---|
| `/api/health` | GET | Public | Service health & database connectivity check |
| `/api/demo` | POST | Rate limited (10/min) | Seeds test buyer, active mandate, sample runs |
| `/api/auth/logout` | POST | Session | Clears session cookie |
| `/api/mandates` | POST | Session / Rate limited | Creates a new mandate draft |
| `/api/mandates/draft` | POST | Rate limited | AI/fallback parsing of natural language instructions |
| `/api/mandates/:id` | GET | Session ownership | Fetches mandate details |
| `/api/mandates/:id/confirm` | POST | Session ownership | Activates a draft mandate |
| `/api/mandates/:id/revoke` | POST | Session ownership | Emergency kill switch: revokes active mandate |
| `/api/runs` | POST | Session ownership | Executes agent cart discovery & policy check |
| `/api/approvals` | GET, PATCH | Session ownership | Lists pending approvals; resolves approve/reject |
| `/api/paypal/health` | GET | Internal / Sandbox | Verifies PayPal Sandbox OAuth connectivity |
| `/api/paypal/orders` | POST | Session + Payment Guard | Creates gated order via PayPal Orders API v2 |
| `/api/paypal/capture` | POST | Session + Payment Guard | Captures approved order; logs to ledger |
| `/api/paypal/refund` | POST | Session ownership | Executes live refund against captured transaction |
| `/api/paypal/vault` | POST | Public (410) | Documents vault token availability status |
| `/api/paypal/webhook` | POST | PayPal signature verify | Receives real webhooks (capture, refund, dispute) |
| `/api/paypal/webhook/replay` | POST | Rate limited | Dev-only simulation of dispute webhook |
| `/api/disputes/advocate` | POST | Session ownership | Generates factual dispute defense using ledger |
| `/api/ledger/verify` | GET | Mandate scoped | Cryptographically verifies SHA-256 hash chain |
| `/api/ledger/export` | GET | Session ownership | Exports ledger in CSV or JSON with verification headers |
| `/api/mcp` | POST | Mandate API Key | External Model Context Protocol server (4 tools) |
| `/api/mcp/keys` | POST | Session ownership | Issues mandate-scoped API key |
| `/api/redteam` | POST | Rate limited | Evaluates adversarial attack fixtures |
