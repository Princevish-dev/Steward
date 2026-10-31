export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "6rem 1.5rem" }}>
      <p style={{ color: "#8b9cff", fontWeight: 700, letterSpacing: "0.12em" }}>STEWARD</p>
      <h1>Give your AI agent a mandate, not your credit card.</h1>
      <p style={{ maxWidth: 640, color: "#b8c0d9", lineHeight: 1.6 }}>
        A PayPal sandbox purchasing agent governed by explicit mandates, deterministic policy
        checks, and a verifiable audit trail.
      </p>
      <a
        href="/new"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: ".8rem 1rem",
          borderRadius: 8,
          background: "#8b9cff",
          color: "#0b1020",
          fontWeight: 700
        }}
      >
        Create a mandate
      </a>
      <a href="/redteam" style={{ display: "inline-block", marginLeft: "1rem", color: "#b8c0d9" }}>
        View red-team checks
      </a>
      <a href="/dashboard" style={{ display: "inline-block", marginLeft: "1rem", color: "#b8c0d9" }}>
        Open control room
      </a>
    </main>
  );
}
