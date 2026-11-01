"use client";

import { useState } from "react";
import Link from "next/link";
import { redTeamFixtures } from "@/core/agents/redteam";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

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
    <div className="page-container">
      <PageHeader
        title="Red-Team Adversarial Tests"
        subtitle="Product titles, descriptions, and merchant fields are untrusted external data. These adversarial attack fixtures prove that prompt injections, instruction overrides, price manipulations, and category masquerading can never compromise the deterministic policy engine."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Red-Team Lab", href: "/redteam" }]}
      />

      {error && (
        <div className="content-section rounded-lg border border-error bg-error-bg p-4">
          <h3 className="text-sm font-semibold text-error">Error</h3>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
        </div>
      )}

      <section className="content-section">
        <div className="space-y-6">
          {redTeamFixtures.map((fixture) => (
            <article key={fixture.id} className="rounded-lg border border-border bg-surface-elevated p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{fixture.id}</h3>
                  <StatusBadge status={fixture.expected} size="sm" />
                </div>
              </div>
              <p className="text-sm text-text-secondary mb-4">{fixture.reason}</p>
              <div className="bg-surface rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-text-secondary mb-1">Attack Vector</p>
                <p className="text-sm text-warning">{fixture.attack}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => runFixture(fixture.id)}
                  disabled={running === fixture.id}
                  className="flex-1"
                >
                  {running === fixture.id ? "Evaluating Attack..." : "Run Fixture Attack"}
                </Button>
                <small className="text-xs text-text-secondary mt-2 flex-1 text-center">
                  Executes safety pipeline: sanitization, regex threat quarantine, and deterministic rule evaluation.
                </small>
              </div>

              {results[fixture.id] && (
                <div aria-live="polite" className="mt-6 border-t border-border pt-6 rounded-lg border-border bg-surface p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-semibold text-text-secondary">Outcome</p>
                      <span className={`text-sm font-medium ${results[fixture.id].decision === "BLOCK" ? "text-error" : "text-success"}`}>
                        {results[fixture.id].decision}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${results[fixture.id].sanitized.flagged ? "text-warning" : "text-success"}`}>
                      {results[fixture.id].sanitized.flagged ? "Injection Quarantined" : "Sanitized Cleanly"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-secondary mb-2">Safety Timeline</p>
                  <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1 mb-4">
                    {results[fixture.id].timeline.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    {results[fixture.id].ruleResults.map((rule) => (
                      <span
                        key={rule.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          rule.passed ? "bg-success/10 border border-success/20 text-success" : "bg-error/10 border border-error/20 text-error"
                        }`}
                      >
                        {rule.id}: {rule.passed ? "PASS" : "FAIL"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <h3 className="text-sm font-semibold text-text-primary mb-3">About Red-Team Testing</h3>
        <p className="text-sm text-text-secondary">
          These five fixtures demonstrate adversarial inputs that attempt to bypass the deterministic policy engine.
          Each fixture is evaluated against all 13 policy rules. The AI Risk Reviewer can only maintain or escalate
          severity — it can never relax a deterministic BLOCK decision.
        </p>
        <p className="text-sm text-text-secondary mt-2">
          <strong>Important:</strong> Five fixtures demonstrate specific attack patterns but do not prove universal
          prompt-injection immunity. Continuous red-team testing is recommended for production use.
        </p>
      </section>
    </div>
  );
}
