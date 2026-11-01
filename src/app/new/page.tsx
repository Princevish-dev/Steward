"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Mandate = {
  id: string;
  owner: string;
  purpose: string;
  period: { type?: "monthly"; budget: number };
  caps: { perItem: number | null; perTransaction?: number | null; maxQuantityPerItem?: number };
  askAbove: number | null;
  status: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

export default function NewMandatePage() {
  const [purpose, setPurpose] = useState("");
  const [owner, setOwner] = useState("");
  const [draft, setDraft] = useState<Mandate | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"parse" | "confirm" | "revoke" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("parse");
    try {
      setMessage("Parsing mandate with AI / deterministic fallback...");
      const response = await fetch("/api/mandates/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, intent: purpose })
      });
      const result = await readJson<{ mandate?: Mandate; clarifications?: string[]; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        setMessage(result.error ?? result.clarifications?.[0] ?? "More details are required.");
        return;
      }
      setDraft(result.mandate);
      setMessage("Draft parsed. Review and customize the limits below, then confirm to activate.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not parse the mandate.");
    } finally {
      setLoading(null);
    }
  }

  async function confirm() {
    if (!draft) return;
    setLoading("confirm");
    try {
      setMessage("Confirming and activating mandate in database...");
      const basePurpose = draft.purpose.split("; max $")[0];
      const intent = `${basePurpose}; max $${draft.period.budget} a month; nothing over $${draft.caps.perItem ?? 0}; ask me above $${draft.askAbove ?? 0}`;
      const createResponse = await fetch("/api/mandates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: draft.owner,
          intent,
          mandate: {
            ...draft,
            period: { type: "monthly", budget: Number(draft.period.budget) },
            caps: {
              perItem: draft.caps.perItem !== null ? Number(draft.caps.perItem) : null,
              perTransaction: 80,
              maxQuantityPerItem: 4
            },
            askAbove: draft.askAbove !== null ? Number(draft.askAbove) : null
          }
        })
      });
      const created = await readJson<{ mandate?: Mandate; error?: string }>(createResponse);
      if (!createResponse.ok || !created.mandate) {
        throw new Error(created.error ?? "Could not persist mandate.");
      }
      const response = await fetch(`/api/mandates/${created.mandate.id}/confirm`, { method: "POST" });
      const result = await readJson<{ mandate?: Mandate; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        throw new Error(result.error ?? "Could not activate mandate.");
      }
      setDraft(result.mandate);
      setMessage("Mandate is ACTIVE and ready for governed runs.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not activate mandate.");
    } finally {
      setLoading(null);
    }
  }

  async function revoke() {
    if (!draft) return;
    setLoading("revoke");
    try {
      const response = await fetch(`/api/mandates/${draft.id}/revoke`, { method: "POST" });
      const result = await readJson<{ mandate?: Mandate; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        throw new Error(result.error ?? "Could not revoke mandate.");
      }
      setDraft(result.mandate);
      setMessage("Mandate REVOKED. Future payments are blocked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke mandate.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link href="/" style={{ color: "#8b9cff" }}>Back to Steward</Link>
      <h1>Create a mandate</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Describe what your agent may buy. Steward turns plain English into explicit limits before anything can be paid.
      </p>
      <p style={{ color: "#f0c674" }}>PayPal Sandbox + fixture-backed Channel3 demo, simulated fulfilment.</p>
      <p style={{ color: "#b8c0d9" }}>Parse creates a reviewable draft; edit the limits, then confirm to activate the mandate.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>Owner email
          <input required type="email" value={owner} onChange={(event) => setOwner(event.target.value)}
            placeholder="you@example.com" style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }} />
          <small style={{ color: "#8b9cff" }}>Session cookie will be scoped to this email.</small>
        </label>
        <label>Purchasing instructions
          <textarea required value={purpose} onChange={(event) => setPurpose(event.target.value)}
            placeholder="Reorder printer paper and coffee for my studio; max $120 a month; nothing over $40 per item; ask me above $60."
            rows={6} style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }} />
          <small style={{ color: "#8b9cff" }}>Specify monthly budget, per-item cap, and human approval threshold.</small>
        </label>
        <button
          type="submit"
          disabled={loading !== null}
          title={loading ? "Evaluating mandate prompt..." : "Extract structured limits from natural language instructions"}
          style={{ width: "fit-content", padding: ".7rem 1.2rem", background: "#8b9cff", color: "#0b1020", fontWeight: 700, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading === "parse" ? "Parsing..." : "Parse mandate"}
        </button>
      </form>
      {draft && (
        <section aria-label="mandate review" style={{ marginTop: "2rem", border: "1px solid #293252", borderRadius: 10, padding: "1.2rem" }}>
          <p><b>Status:</b> <span style={{ color: draft.status === "ACTIVE" ? "#6ee7b7" : draft.status === "REVOKED" ? "#ff7b8b" : "#f0c674" }}>{draft.status}</span></p>
          <p><b>Purpose:</b> {draft.purpose}</p>
          <label>Monthly budget ($)
            <input type="number" value={draft.period.budget} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, period: { budget: Number(event.target.value) } })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem", width: "100%", maxWidth: 200 }} />
          </label>
          <label style={{ display: "block", marginTop: ".8rem" }}>Per-item cap ($)
            <input type="number" value={draft.caps.perItem ?? 0} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, caps: { perItem: Number(event.target.value) } })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem", width: "100%", maxWidth: 200 }} />
          </label>
          <label style={{ display: "block", marginTop: ".8rem" }}>Ask human above ($)
            <input type="number" value={draft.askAbove ?? 0} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, askAbove: Number(event.target.value) })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem", width: "100%", maxWidth: 200 }} />
          </label>
          {draft.status === "DRAFT" ? (
            <button
              type="button"
              onClick={confirm}
              disabled={loading !== null}
              title="Activate this mandate so the agent can execute purchases under these rules"
              style={{ marginTop: "1rem", padding: ".7rem 1.2rem", background: "#6ee7b7", color: "#0b1020", fontWeight: 700, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading === "confirm" ? "Confirming..." : "Confirm mandate (ACTIVE)"}
            </button>
          ) : draft.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={revoke}
              disabled={loading !== null}
              title="Permanently revoke this mandate to block all future spending"
              style={{ marginTop: "1rem", padding: ".7rem 1.2rem", background: "#ff7b8b", color: "#0b1020", fontWeight: 700, borderRadius: 6, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading === "revoke" ? "Revoking..." : "Revoke mandate"}
            </button>
          ) : null}
          {draft.status === "ACTIVE" && (
            <p style={{ marginTop: "1rem" }}>
              <Link href={`/dashboard?mandateId=${draft.id}`} style={{ color: "#8b9cff", textDecoration: "underline", fontWeight: 700 }}>
                Open control room with this mandate &rarr;
              </Link>
            </p>
          )}
        </section>
      )}
      {message && <p role="status" style={{ marginTop: "1rem", color: "#6ee7b7" }}>{message}</p>}
    </main>
  );
}
