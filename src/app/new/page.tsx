"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Mandate = {
  id: string;
  owner: string;
  purpose: string;
  period: { budget: number };
  caps: { perItem: number | null };
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
      setMessage("Parsing mandate...");
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
      setMessage("Draft parsed. Review the limits, then confirm.");
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
      setMessage("Confirming mandate...");
      const basePurpose = draft.purpose.split("; max $")[0];
      const intent = `${basePurpose}; max $${draft.period.budget} a month; nothing over $${draft.caps.perItem ?? 0}; ask me above $${draft.askAbove ?? 0}`;
      const createResponse = await fetch("/api/mandates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: draft.owner, intent })
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
        </label>
        <label>Purchasing instructions
          <textarea required value={purpose} onChange={(event) => setPurpose(event.target.value)}
            placeholder="Reorder printer paper and coffee for my studio; max $120 a month; nothing over $40 per item; ask me above $60."
            rows={6} style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem", boxSizing: "border-box" }} />
        </label>
        <button type="submit" disabled={loading !== null} style={{ width: "fit-content", padding: ".7rem 1rem" }}>{loading === "parse" ? "Parsing..." : "Parse mandate"}</button>
      </form>
      {draft && (
        <section aria-label="mandate review" style={{ marginTop: "2rem", border: "1px solid #293252", borderRadius: 10, padding: "1rem" }}>
          <p><b>Status:</b> {draft.status}</p>
          <p><b>Purpose:</b> {draft.purpose}</p>
          <label>Monthly budget
            <input type="number" value={draft.period.budget} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, period: { budget: Number(event.target.value) } })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem" }} />
          </label>
          <label style={{ display: "block", marginTop: ".8rem" }}>Per-item cap
            <input type="number" value={draft.caps.perItem ?? 0} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, caps: { perItem: Number(event.target.value) } })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem" }} />
          </label>
          <label style={{ display: "block", marginTop: ".8rem" }}>Ask above
            <input type="number" value={draft.askAbove ?? 0} disabled={draft.status !== "DRAFT"}
              onChange={(event) => setDraft({ ...draft, askAbove: Number(event.target.value) })}
              style={{ display: "block", padding: ".6rem", marginTop: ".3rem" }} />
          </label>
          {draft.status === "DRAFT" ? (
            <button type="button" onClick={confirm} disabled={loading !== null} style={{ marginTop: "1rem", padding: ".7rem 1rem" }}>{loading === "confirm" ? "Confirming..." : "Confirm mandate (ACTIVE)"}</button>
          ) : draft.status === "ACTIVE" ? (
            <button type="button" onClick={revoke} disabled={loading !== null} style={{ marginTop: "1rem", padding: ".7rem 1rem" }}>{loading === "revoke" ? "Revoking..." : "Revoke mandate"}</button>
          ) : null}
          {draft.status === "ACTIVE" && <p><Link href={`/dashboard?mandateId=${draft.id}`}>Open control room</Link></p>}
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </main>
  );
}
