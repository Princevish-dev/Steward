import { redTeamFixtures } from "@/core/agents/redteam";

export default function RedTeamPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <a href="/" style={{ color: "#8b9cff" }}>Back to Steward</a>
      <h1>Red-team safety checks</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Product text is untrusted data. These fixtures must never increase spending authority.
      </p>
      <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        {redTeamFixtures.map((fixture) => (
          <article key={fixture.id} style={{ border: "1px solid #293252", borderRadius: 10, padding: "1rem" }}>
            <strong>{fixture.id}</strong>
            <p style={{ color: "#f0c674" }}>{fixture.attack}</p>
            <p><b>Expected:</b> {fixture.expected}</p>
            <p style={{ color: "#b8c0d9" }}>{fixture.reason}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
