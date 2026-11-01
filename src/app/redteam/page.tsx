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
      <Link href="/" style={{ color: "#8b9cff" }}>Back to Steward</Link>
      <h1>Red-team safety checks</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Product text is untrusted data. These fixtures must never increase spending authority.
      </p>
      <p style={{ color: "#f0c674" }}>PayPal Sandbox + fixture-backed Channel3 demo, simulated fulfilment.</p>
      <p style={{ color: "#b8c0d9" }}>Run each fixture to see sanitization, the deterministic decision, and all 13 rule outcomes.</p>
      {error && <p role="alert" style={{ color: "#ff7b8b" }}>{error}</p>}
      <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        {redTeamFixtures.map((fixture) => (
          <article key={fixture.id} style={{ border: "1px solid #293252", borderRadius: 10, padding: "1rem" }}>
            <strong>{fixture.id}</strong>
            <p style={{ color: "#f0c674" }}>{fixture.attack}</p>
            <p><b>Expected:</b> {fixture.expected}</p>
            <p style={{ color: "#b8c0d9" }}>{fixture.reason}</p>
            <button type="button" onClick={() => runFixture(fixture.id)} disabled={running === fixture.id}
              style={{ padding: ".6rem .8rem", position: "relative", zIndex: 1 }}>
              {running === fixture.id ? "Running..." : "Run fixture"}
            </button>
            {results[fixture.id] && (
              <div aria-live="polite" style={{ marginTop: "1rem", borderTop: "1px solid #293252", paddingTop: ".8rem" }}>
                <strong>Outcome: {results[fixture.id].decision}</strong>
                <p>{results[fixture.id].sanitized.flagged ? "Injection quarantined." : "Text sanitized."}</p>
                <ol>{results[fixture.id].timeline.map((step) => <li key={step}>{step}</li>)}</ol>
                <div>{results[fixture.id].ruleResults.map((rule) => (
                  <span key={rule.id} style={{ display: "inline-block", margin: ".2rem", padding: ".2rem .4rem", background: rule.passed ? "#173b35" : "#3b3040", borderRadius: 4 }}>
                    {rule.id}: {rule.passed ? "PASS" : "FAIL"}
                  </span>
                ))}</div>
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
