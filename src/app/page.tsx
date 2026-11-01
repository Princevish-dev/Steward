import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <p style={{ color: "#8b9cff", fontWeight: 700, letterSpacing: "0.12em", marginBottom: ".5rem" }}>
        STEWARD • PAYPAL AI HACKATHON
      </p>
      <h1 style={{ fontSize: "2.5rem", lineHeight: 1.2, margin: "0 0 1rem" }}>
        Give your AI agent a mandate, not your credit card.
      </h1>
      <p style={{ maxWidth: 700, color: "#b8c0d9", lineHeight: 1.6, fontSize: "1.1rem" }}>
        An autonomous purchasing agent governed by explicit human mandates, 13 deterministic policy checks, and a tamper-evident cryptographic audit ledger. PayPal Sandbox checkout and settlement with zero unauthorized spending.
      </p>

      {/* Primary Actions */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
        <Link
          href="/dashboard"
          style={{
            padding: ".8rem 1.4rem",
            borderRadius: 8,
            background: "#8b9cff",
            color: "#0b1020",
            fontWeight: 700,
            textDecoration: "none"
          }}
        >
          Open Control Room →
        </Link>
        <Link
          href="/new"
          style={{
            padding: ".8rem 1.4rem",
            borderRadius: 8,
            border: "1px solid #8b9cff",
            color: "#8b9cff",
            fontWeight: 700,
            textDecoration: "none"
          }}
        >
          Create a Mandate
        </Link>
        <Link
          href="/redteam"
          style={{
            padding: ".8rem 1.4rem",
            borderRadius: 8,
            border: "1px solid #293252",
            color: "#b8c0d9",
            textDecoration: "none"
          }}
        >
          View Red-Team Checks
        </Link>
      </div>

      {/* Architectural Pillars */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem", marginTop: "3.5rem" }}>
        <div style={{ border: "1px solid #293252", borderRadius: 10, padding: "1.2rem", background: "#13192f" }}>
          <h3 style={{ color: "#6ee7b7", marginTop: 0 }}>1. Governed AI Agent</h3>
          <p style={{ color: "#b8c0d9", lineHeight: 1.6, fontSize: ".95rem" }}>
            The AI proposes purchases from natural language instructions. The deterministic policy engine strictly enforces spending caps, merchant rules, and budget limits before any order can be created.
          </p>
        </div>
        <div style={{ border: "1px solid #293252", borderRadius: 10, padding: "1.2rem", background: "#13192f" }}>
          <h3 style={{ color: "#f0c674", marginTop: 0 }}>2. PayPal Sandbox Settlement</h3>
          <p style={{ color: "#b8c0d9", lineHeight: 1.6, fontSize: ".95rem" }}>
            Orders are created and captured via PayPal Orders API v2 in Sandbox. Buyer approval is required for checkout, with live Sandbox refund capability and cryptographic webhook signature verification.
          </p>
        </div>
        <div style={{ border: "1px solid #293252", borderRadius: 10, padding: "1.2rem", background: "#13192f" }}>
          <h3 style={{ color: "#8b9cff", marginTop: 0 }}>3. Immutable SHA-256 Ledger</h3>
          <p style={{ color: "#b8c0d9", lineHeight: 1.6, fontSize: ".95rem" }}>
            Every state transition — mandate creation, policy decision, approval, order capture, refund, and webhook — is recorded in an SHA-256 hash-chained audit trail persisted in PostgreSQL.
          </p>
        </div>
      </section>

      {/* Real vs Fixture vs Simulated Disclosure */}
      <section style={{ marginTop: "3rem", borderTop: "1px solid #293252", paddingTop: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem" }}>Implementation Reality &amp; Disclosures</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          <div style={{ background: "#0b1020", border: "1px solid #173b35", borderRadius: 8, padding: "1rem" }}>
            <strong style={{ color: "#6ee7b7" }}>REAL • Live in Production</strong>
            <ul style={{ color: "#b8c0d9", fontSize: ".9rem", paddingLeft: "1.2rem", lineHeight: 1.6, marginTop: ".5rem" }}>
              <li>Live AI calls (Gemini 3.5 Flash Lite / Claude Sonnet)</li>
              <li>13 Deterministic policy enforcement rules</li>
              <li>PayPal Sandbox Orders API v2 checkout &amp; capture</li>
              <li>PayPal Sandbox live refund execution</li>
              <li>PayPal Webhook signature verification API</li>
              <li>Neon PostgreSQL SHA-256 hash-chained audit ledger</li>
              <li>Mandate-scoped Model Context Protocol (MCP) server</li>
              <li>Dispute Advocate structured evidence generator</li>
            </ul>
          </div>
          <div style={{ background: "#0b1020", border: "1px solid #3b3040", borderRadius: 8, padding: "1rem" }}>
            <strong style={{ color: "#f0c674" }}>FIXTURE • Documented Fallback</strong>
            <ul style={{ color: "#b8c0d9", fontSize: ".9rem", paddingLeft: "1.2rem", lineHeight: 1.6, marginTop: ".5rem" }}>
              <li>Channel3 product search fallback (active when CHANNEL3_API_KEY is not set; labelled as fixture)</li>
              <li>5 Red-team adversarial attack test fixtures</li>
            </ul>
          </div>
          <div style={{ background: "#0b1020", border: "1px solid #293252", borderRadius: 8, padding: "1rem" }}>
            <strong style={{ color: "#8b9cff" }}>SIMULATED • Development Controls</strong>
            <ul style={{ color: "#b8c0d9", fontSize: ".9rem", paddingLeft: "1.2rem", lineHeight: 1.6, marginTop: ".5rem" }}>
              <li>Shipment carrier tracking (simulated carrier &amp; tracking number, tracked in ledger)</li>
              <li>Dispute webhook simulation button for instant local verification of webhook transitions</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
