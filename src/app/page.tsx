import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "6rem 1.5rem" }}>
      <p style={{ color: "#8b9cff", fontWeight: 700, letterSpacing: "0.12em", marginBottom: ".75rem" }}>
        STEWARD • PAYPAL AI HACKATHON
      </p>
      <h1 style={{ fontSize: "2.75rem", lineHeight: 1.2, margin: "0 0 1.25rem", fontWeight: 800 }}>
        Give your AI agent a mandate, not your credit card.
      </h1>
      <p style={{ maxWidth: 680, color: "#b8c0d9", lineHeight: 1.6, fontSize: "1.15rem", margin: "0 0 2.5rem" }}>
        An autonomous purchasing agent governed by explicit human mandates, 13 deterministic policy checks, and a tamper-evident cryptographic audit ledger. PayPal Sandbox checkout and settlement with zero unauthorized spending.
      </p>

      {/* Primary Actions */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <Link
          href="/dashboard"
          style={{
            padding: ".85rem 1.6rem",
            borderRadius: 8,
            background: "#8b9cff",
            color: "#0b1020",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block"
          }}
        >
          Open Control Room →
        </Link>
        <Link
          href="/new"
          style={{
            padding: ".85rem 1.6rem",
            borderRadius: 8,
            border: "1px solid #8b9cff",
            color: "#8b9cff",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block"
          }}
        >
          Create a Mandate
        </Link>
        <Link
          href="/redteam"
          style={{
            padding: ".85rem 1.6rem",
            borderRadius: 8,
            border: "1px solid #293252",
            color: "#b8c0d9",
            textDecoration: "none",
            display: "inline-block"
          }}
        >
          View Red-Team Checks
        </Link>
      </div>
    </main>
  );
}
