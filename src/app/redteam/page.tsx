"use client";

import { useState } from "react";
import { redTeamFixtures } from "@/core/agents/redteam";
import Link from "next/link";

type RedTeamResult = {
  decision: string;
  timeline: string[];
  sanitized: { flagged: boolean; sanitized: string };
  ruleResults: Array<{ id: string; passed: boolean; reason: string }>;
};

export default function RedTeamPage() {
  const [results, setResults] = useState<Record<string, RedTeamResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runFixture(fixtureId: string) {
    setRunning(fixtureId);
    setError(null);
    try {
      const response = await fetch("/api/redteam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fixtureId })
      });
      const text = await response.text();
      const result = text ? JSON.parse(text) as Partial<RedTeamResult> & { error?: string } : {};
      if (!response.ok) throw new Error(result.error ?? "Fixture could not be evaluated.");
      if (!result.decision || !result.timeline || !result.sanitized || !result.ruleResults) {
        throw new Error("The safety API returned an incomplete fixture result.");
      }
      setResults((current) => ({ ...current, [fixtureId]: result as RedTeamResult }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fixture could not be evaluated.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <Link href="/" style={{ color: "#8b9cff" }}>&larr; Back to Steward</Link>
      <h1 style={{ marginTop: "1rem" }}>Red-Team Adversarial Tests</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Product titles, descriptions, and merchant fields are untrusted external data. These adversarial attack fixtures prove that prompt injections, instruction overrides, price manipulations, and category masquerading can never compromise the deterministic policy engine.
      </p>
      <p style={{ color: "#f0c674" }}>PayPal Sandbox + fixture-backed Channel3 demo, simulated fulfilment.</p>
      <small style={{ display: "block", color: "#8b9cff" }}>
        Run each fixture to verify sanitization quarantine, policy decision (BLOCK), and the complete 13-rule evaluation.
      </small>

      {error && <p role="alert" style={{ color: "#ff7b8b", marginTop: "1rem" }}>{error}</p>}

      <div style={{ display: "grid", gap: "1.2rem", marginTop: "2rem" }}>
        {redTeamFixtures.map((fixture) => (
          <article key={fixture.id} style={{ border: "1px solid #293252", borderRadius: 10, padding: "1.2rem", background: "#13192f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "1.1rem" }}>{fixture.id}</strong>
              <span style={{ padding: ".2rem .5rem", borderRadius: 4, background: "#3b3040", color: "#f0c674", fontSize: ".85rem" }}>
                Target: {fixture.expected}
              </span>
            </div>
            <p style={{ color: "#f0c674", margin: ".6rem 0" }}><strong>Attack Vector:</strong> {fixture.attack}</p>
            <p style={{ color: "#b8c0d9", margin: ".4rem 0" }}>{fixture.reason}</p>
            <button
              type="button"
              onClick={() => runFixture(fixture.id)}
              disabled={running === fixture.id}
              title={`Simulate ${fixture.id} attack against deterministic policy`}
              style={{
                marginTop: ".8rem",
                padding: ".6rem 1.2rem",
                background: running === fixture.id ? "#333" : "#8b9cff",
                color: "#08111f",
                fontWeight: 700,
                borderRadius: 6,
                cursor: running === fixture.id ? "not-allowed" : "pointer"
              }}
            >
              {running === fixture.id ? "Evaluating Attack..." : "Run Fixture Attack"}
            </button>
            <small style={{ display: "block", color: "#8b9cff", marginTop: ".4rem" }}>
              Executes safety pipeline: sanitization, regex threat quarantine, and deterministic rule evaluation.
            </small>

            {results[fixture.id] && (
              <div aria-live="polite" style={{ marginTop: "1rem", borderTop: "1px solid #293252", paddingTop: "1rem", background: "#0b1020", padding: "1rem", borderRadius: 6 }}>
                <strong style={{ color: results[fixture.id].decision === "BLOCK" ? "#ff7b8b" : "#6ee7b7" }}>
                  Outcome: {results[fixture.id].decision}
                </strong>
                <p style={{ margin: ".4rem 0", color: results[fixture.id].sanitized.flagged ? "#f0c674" : "#6ee7b7" }}>
                  {results[fixture.id].sanitized.flagged ? "Injection quarantined by safety filter." : "Text sanitized cleanly."}
                </p>
                <ol style={{ paddingLeft: "1.2rem", color: "#b8c0d9" }}>
                  {results[fixture.id].timeline.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem", marginTop: ".6rem" }}>
                  {results[fixture.id].ruleResults.map((rule) => (
                    <span key={rule.id} style={{ display: "inline-block", padding: ".2rem .5rem", background: rule.passed ? "#173b35" : "#3b3040", color: rule.passed ? "#6ee7b7" : "#ff7b8b", borderRadius: 4, fontSize: ".8rem" }}>
                      {rule.id}: {rule.passed ? "PASS" : "FAIL"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
