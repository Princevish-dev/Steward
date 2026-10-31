"use client";

import { FormEvent, useState } from "react";

export default function NewMandatePage() {
  const [purpose, setPurpose] = useState("");
  const [owner, setOwner] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || !purpose) {
      setMessage("Enter your email and purchasing instructions.");
      return;
    }
    setMessage("Drafting mandate...");
    const response = await fetch("/api/mandates/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner, intent: purpose })
    });
    const result = await response.json() as { mandate?: { period: { budget: number } }; clarifications?: string[]; error?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Unable to draft mandate.");
      return;
    }
    setMessage(
      result.mandate
        ? `Draft ready: $${result.mandate.period.budget.toFixed(2)} monthly budget.${result.clarifications?.length ? ` Clarification: ${result.clarifications[0]}` : ""}`
        : result.clarifications?.[0] ?? "More details are required."
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <a href="/" style={{ color: "#8b9cff" }}>Back to Steward</a>
      <h1>Create a mandate</h1>
      <p style={{ color: "#b8c0d9", lineHeight: 1.6 }}>
        Describe what your agent may buy. Steward will turn it into explicit limits before anything can be paid.
      </p>
      <form onSubmit={submit} style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <label>
          Owner email
          <input
            required
            type="email"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="you@example.com"
            style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem" }}
          />
        </label>
        <label>
          Purchasing instructions
          <textarea
            required
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Reorder printer paper and coffee for my studio; max $120 a month; nothing over $40 per item; ask me above $60."
            rows={6}
            style={{ display: "block", width: "100%", marginTop: ".4rem", padding: ".8rem" }}
          />
        </label>
        <button type="submit" style={{ width: "fit-content", padding: ".7rem 1rem" }}>
          Draft mandate
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </main>
  );
}
