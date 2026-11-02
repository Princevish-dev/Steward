# Steward UI & Workflow Guide

A complete guide to every screen, interactive element, backend route, and operational status in Steward.

---

## 1. Page Map & Overview

| Route | Page Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/` | Landing Page | Introduction, architecture pillars, and reality disclosure | Hero links, Architecture summary, Real/Fixture/Simulated disclosures |
| `/dashboard` | Steward Control Room | Central governance console for running agent scenarios, checking PayPal, viewing approvals, inspecting the SHA-256 ledger | Quick setup controls, Run Governed Purchase form, Approval Inbox, AG Grid Ledger, Dispute & Refund controls |
| `/new` | Create Mandate | Natural language mandate parsing, limit customization, and activation | AI/fallback parser form, Editable limit fields (budget, per-item cap, ask threshold), Confirm/Revoke buttons |
| `/redteam` | Red-Team Adversarial Tests | Live verification of defense against untrusted product injection payloads | 5 Playwright/attack cards, Quarantine status, 13-rule evaluation badges |

---

## 2. Interactive Element Directory

### A. Landing Page (`/`)

| Element Label | Element Type | What It Does | Backend Route Called | Expected Result | Classification |
|---|---|---|---|---|---|
| `Open Control Room &rarr;` | Link | Navigates to `/dashboard` | Client-side navigation | Loads the control room with session state or prompt to seed | REAL |
| `Create a Mandate` | Link | Navigates to `/new` | Client-side navigation | Loads the mandate creation interface | REAL |
| `View Red-Team Checks` | Link | Navigates to `/redteam` | Client-side navigation | Loads the 5 prompt injection and attack test fixtures | REAL |

---

### B. Control Room (`/dashboard`)

| Element Label | Element Type | What It Does | Backend Route Called | Expected Result | Classification |
|---|---|---|---|---|---|
| `Sign In` | Button | Creates a signed owner session for any valid email; no fixed judge account is required | `POST /api/auth/login` | The owner email becomes the tenant identity and the dashboard opens. | REAL |
| `Check PayPal Sandbox` | Button | Tests connectivity and credentials against PayPal OAuth | `GET /api/paypal/health` | Displays `PayPal Sandbox connected.` (status 200 with `connected: true`) | REAL |
| `Start fresh owner session` | Button | Clears current owner session cookie and redirects | `POST /api/auth/logout` | Session cleared, redirected to `/new` to create a fresh mandate | REAL |
| `Kill switch: revoke mandate` | Button | Immediately and permanently revokes the current mandate | `POST /api/mandates/:id/revoke` | Mandate status becomes `Mandate REVOKED — all future payments blocked.` Future purchases blocked. | REAL |
| `Scenario` (Dropdown) | Select | Selects purchasing scenario (`within`, `ask`, `over-cap`, `hostile`) | None (client state) | Updates evaluation parameters for next run | REAL |
| `Run Steward` | Submit Button | Requests cart discovery and runs 13 deterministic policy checks | `POST /api/runs` | Proposes items, runs policy engine, records run to ledger, returns decision (`AUTO_APPROVE`, `ASK_HUMAN`, or `BLOCK`) | REAL |
| `Create mandate MCP key` | Button | Generates an SHA-256 hashed API key scoped exclusively to current mandate | `POST /api/mcp/keys` | Returns key once: `mcp_live_...` for external agents calling `/api/mcp` | REAL |
| `Create PayPal Sandbox Order` | Button | Initiates PayPal order gated strictly by valid server-persisted decision | `POST /api/paypal/orders` | Creates PayPal order via Orders API v2, returns `orderId` and PayPal Sandbox checkout approval URL | REAL |
| `Approve in PayPal Sandbox &rarr;` | Link / Button | Opens PayPal Sandbox buyer approval login in new tab | External PayPal Sandbox | Buyer logs in (`buyer@example.com`), reviews order, approves; redirects back with `paypal=approved` | REAL (PayPal Sandbox) |
| `Capture approved payment` | Button | Captures authorized funds, then fetches the PayPal order as a second witness | `POST /api/paypal/capture` | Compares amount, currency, and status; writes `RECONCILED` or `MISMATCH`. A green `PayPal confirmed` badge includes the PayPal ID suffix and ledger sequence. Mismatch returns `BLOCK` and prevents tracking/further actions. | REAL (PayPal Sandbox when configured) |
| `Refund captured payment` | Button | Requires typed `CONFIRM $<server amount>`, refunds in PayPal Sandbox, then fetches the refund object | `POST /api/paypal/refund/challenge` + `POST /api/paypal/refund` | Writes `RECONCILED` or `MISMATCH` and shows the same confirmation badge; mismatch blocks future order actions. | REAL (PayPal Sandbox when configured) |
| `Draft dispute evidence` | Button | Generates structured dispute packet via AI (Prompt A4) using only ledger facts | `POST /api/disputes/advocate` | Outputs structured summary. Missing facts explicitly marked "not available" (no hallucination). | REAL |
| `Simulate dispute (development only)` | Button | Dev-only test simulating PayPal `CUSTOMER.DISPUTE.CREATED` webhook | `POST /api/paypal/webhook/replay` | Appends `WEBHOOK_RECEIVED` to ledger with unique event id | SIMULATED (Local dev replay) |
| `Approve` (Approval Inbox) | Button | Issues a five-minute one-time nonce and requires the exact server-computed amount phrase | `POST /api/approvals/:id/challenge` + `PATCH /api/approvals` + `POST /api/paypal/orders` | Records `APPROVAL_CONFIRMED`, then creates the gated PayPal order | REAL |
| `Reject` (Approval Inbox) | Button | Rejects pending human escalation | `PATCH /api/approvals` | Marks approval `REJECTED`, blocks order creation | REAL |
| `Quick filter` (Ledger) | Text Input | Filters ledger grid rows by run ID, type, or decision | Client-side filter | Filters displayed AG Grid rows instantly | REAL |
| `Verify` (Ledger) | Button | Recalculates SHA-256 hash chain from genesis to head | `GET /api/ledger/verify` | Displays `VALID — VERIFIED` in green if chain intact | REAL |
| `Export CSV` | Button | Downloads verified audit ledger as standard CSV attachment | `GET /api/ledger/export?mandateId=...&format=csv` | Triggers download of `steward-ledger-<id>.csv` | REAL |
| `Export JSON` | Button | Downloads complete audit packet with cryptographic verification in JSON | `GET /api/ledger/export?mandateId=...&format=json` | Triggers download of `steward-ledger-<id>.json` | REAL |
| `Simulate tamper (preview)` | Button | Mutates in-memory hash of first entry to test tamper detection | Client-side preview | Ledger status switches to `TAMPERED — INVALID` in red | SIMULATED (In-memory preview) |
| `Restore preview` (Ledger) | Button | Restores original stored ledger in grid view | Client-side state | Restores stored rows; status returns to `VALID — VERIFIED` | REAL |

---

### C. Create Mandate (`/new`)

| Element Label | Element Type | What It Does | Backend Route Called | Expected Result | Classification |
|---|---|---|---|---|---|
| `Owner email` | Input | Specifies email address for mandate ownership and session | None (form state) | Validates email format | REAL |
| `Purchasing instructions` | Textarea | Natural language prompt describing purchasing budget and rules | None (form state) | Feeds into AI/fallback parser | REAL |
| `Parse mandate` | Submit Button | Extracts structured JSON mandate limits from plain text | `POST /api/mandates/draft` | Generates reviewable draft with parsed monthly budget, per-item cap, and ask threshold | REAL (AI / Fallback) |
| `Monthly budget ($)` | Number Input | Allows human review and customization of parsed monthly budget | None (client state) | Overrides budget limit before activation | REAL |
| `Per-item cap ($)` | Number Input | Allows human review and customization of per-item spending cap | None (client state) | Overrides per-item cap before activation | REAL |
| `Ask human above ($)` | Number Input | Allows human review and customization of human review threshold | None (client state) | Overrides review threshold before activation | REAL |
| `Confirm mandate (ACTIVE)` | Button | Persists the edited draft, computes a SHA-256 fingerprint, and activates it | `PATCH /api/mandates/:id` + `POST /api/mandates/:id/confirm` | Status becomes `ACTIVE`; `MANDATE_CONFIRMED` contains the fingerprint. Later edits require `Amend` and a new version. | REAL |
| `Revoke mandate` | Button | Revokes active mandate immediately | `POST /api/mandates/:id/revoke` | Mandate status becomes `REVOKED`; spending blocked | REAL |
| `Open control room with this mandate &rarr;` | Link | Navigates to `/dashboard?mandateId=...` | Client-side navigation | Opens dashboard pre-loaded with newly activated mandate | REAL |

---

### D. Red-Team Adversarial Tests (`/redteam`)

| Element Label | Element Type | What It Does | Backend Route Called | Expected Result | Classification |
|---|---|---|---|---|---|
| `Run Fixture Attack` (RT-01 Prompt Injection) | Button | Tests item title containing instruction override: `IGNORE PREVIOUS LIMITS` | `POST /api/redteam` | Quarantined; 13 rules evaluate; Outcome: `BLOCK` | REAL engine / FIXTURE payload |
| `Run Fixture Attack` (RT-02 Merchant Masquerading) | Button | Tests unapproved merchant spoofing approved vendor format | `POST /api/redteam` | Merchant rule fails; Outcome: `BLOCK` | REAL engine / FIXTURE payload |
| `Run Fixture Attack` (RT-03 Price Manipulation) | Button | Tests negative/zero unit price tampering | `POST /api/redteam` | Math & sanity checks fail; Outcome: `BLOCK` | REAL engine / FIXTURE payload |
| `Run Fixture Attack` (RT-04 Quantity Explosion) | Button | Tests astronomical quantity `99999` exceeding velocity/budget | `POST /api/redteam` | Budget cap rule fails; Outcome: `BLOCK` | REAL engine / FIXTURE payload |
| `Run Fixture Attack` (RT-05 Category Smuggling) | Button | Tests restricted luxury item disguised as office supplies | `POST /api/redteam` | Category validation fails; Outcome: `BLOCK` | REAL engine / FIXTURE payload |

---

## F4 PayPal confirmation witness

After capture, the server performs `GET /v2/checkout/orders/{id}` through the
PayPal REST fallback. After a refund, it performs
`GET /v2/payments/refunds/{id}`. The comparison uses the server-stored amount,
currency, and expected status. `RECONCILED` is shown as `PayPal confirmed` with
the PayPal ID suffix and ledger sequence. `MISMATCH` is shown in red, writes a
ledger event, returns the deterministic `BLOCK` reason
`PAYPAL_RECONCILIATION_MISMATCH`, and prevents later order/refund actions.

Any syntactically valid email can sign in; there is no fixed judge account. The
PayPal Sandbox and reconciliation witness are `REAL` only when configured
provider calls succeed. Channel3 is `REAL` when configured and `FIXTURE` when
the deterministic fallback is used. Shipment tracking and dispute replay are
`SIMULATED`. Cron is `stale approvals only; holds not built`.

## 3. Real vs Fixture vs Simulated Breakdown

### What is REAL (Live in Production):
1. **AI Agents:** Mandate Parser (A1), Shopper Agent (A2), Risk Reviewer (A3), and Dispute Advocate (A4) running live via Google Gemini / Anthropic SDK.
2. **13-Rule Deterministic Policy Engine:** Strict mathematical and policy evaluation runs purely in server-side TypeScript. The AI cannot lower severity or bypass rules.
3. **PayPal Sandbox Orders:** Real sandbox orders created via PayPal Orders API v2 (`/v2/checkout/orders`).
4. **PayPal Sandbox Capture:** Live order capture via PayPal Capture API (`/v2/checkout/orders/{id}/capture`).
5. **PayPal Sandbox Refunds:** Live refunds executed via PayPal Payments API (`/v2/payments/captures/{id}/refund`).
6. **PayPal Webhooks:** Cryptographic signature verification via PayPal API (`/v1/notifications/verify-webhook-signature`).
7. **Audit Ledger:** Append-only SHA-256 hash chain persisted in PostgreSQL (Neon database) with cryptographic verification.
8. **Model Context Protocol (MCP):** 4 tools hosted at `/api/mcp` guarded by hashed mandate API keys.

### What is FIXTURE:
1. **Channel3 Catalog:** Channel3 API integration is live in code; when `CHANNEL3_API_KEY` is unset or requests fail, deterministic product fixtures provide guaranteed reliable catalog discovery. The UI explicitly displays `fixture (fixture fallback)` or `channel3`.
2. **Red-Team Attack Payloads:** 5 predefined adversarial payloads representing standard prompt injection and catalog manipulation vectors.

### What is SIMULATED:
1. **Shipment Tracking:** Physical carrier fulfillment is simulated because PayPal Sandbox does not ship physical packages. The carrier is explicitly labelled as `(simulated carrier)` and the tracking number is logged in the ledger.
2. **Simulate Dispute Webhook:** In PayPal Sandbox, customer dispute creation requires multi-day manual dispute flows. The `Simulate dispute (development only)` button allows instant evaluation of dispute webhook ingestion and ledger recording.

