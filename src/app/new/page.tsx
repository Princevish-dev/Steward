"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type MandateDraft = {
  id: string;
  owner: string;
  purpose: string;
  period: { type: "monthly"; budget: number };
  caps: { perItem: number | null; perTransaction: number | null; maxQuantityPerItem: number };
  askAbove: number | null;
  categories: string[];
  merchants: { allow: string[]; deny: string[] };
  velocity: { maxAutoPurchasesPer24h: number };
  expiresAt: string;
  status: string;
  version?: number;
  previousVersionId?: string;
  fingerprint?: string;
  source?: string;
};

type Step = "intent" | "parsing" | "review" | "risk" | "confirm" | "success";

type Clarification = { field: string; message: string };

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Steward returned an invalid response (${response.status}).`);
  }
}

const stepOrder: Step[] = ["intent", "parsing", "review", "risk", "confirm", "success"];

export default function NewMandatePage() {
  const [step, setStep] = useState<Step>("intent");
  const [owner, setOwner] = useState("");
  const [purpose, setPurpose] = useState("");
  const [draft, setDraft] = useState<MandateDraft | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const suppressAutoSave = useRef(false);

  const currentStepIndex = stepOrder.indexOf(step);

  const persistDraft = useCallback(async (draftToSave: MandateDraft) => {
    setDraftSaveState("saving");
    try {
      const response = await fetch(`/api/mandates/${draftToSave.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToSave)
      });
      const result = await readJson<{ mandate?: MandateDraft; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        throw new Error(result.error ?? "Draft changes could not be saved.");
      }
      setDraftSaveState("saved");
      return result.mandate;
    } catch (saveError) {
      setDraftSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "Draft changes could not be saved.");
      throw saveError;
    }
  }, []);

  useEffect(() => {
    const draftId = new URLSearchParams(window.location.search).get("draftId");
    if (!draftId) return;

    let cancelled = false;
    setStep("parsing");
    setLoading(true);
    setMessage("Loading saved mandate version…");
    void (async () => {
      try {
        const response = await fetch(`/api/mandates/${encodeURIComponent(draftId)}`);
        const result = await readJson<{ mandate?: MandateDraft; error?: string }>(response);
        if (!response.ok || !result.mandate) throw new Error(result.error ?? "Saved mandate could not be loaded.");
        if (cancelled) return;
        setDraft(result.mandate);
        setOwner(result.mandate.owner);
        setPurpose(result.mandate.purpose);
        setClarifications([]);
        setMessage("Amendment draft loaded. Edits are saved automatically; confirm to activate this version.");
        setStep("review");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Saved mandate could not be loaded.");
        setStep("intent");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draft || draft.status !== "DRAFT") return;
    const timeout = setTimeout(() => {
      if (suppressAutoSave.current) return;
      void persistDraft(draft).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timeout);
  }, [draft, persistDraft]);

  const parseMandate = useCallback(async () => {
    if (!owner || !purpose) {
      setError("Owner email and purchasing instructions are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage("Parsing mandate with AI / deterministic fallback...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20_000);

    try {
      const response = await fetch("/api/mandates/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, intent: purpose }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status >= 500) {
        throw new Error(`Server error (${response.status}): Mandate parsing failed. Please try again or refine instructions.`);
      }

      const result = await readJson<{ mandate?: MandateDraft; clarifications?: string[]; refusalReason?: string; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        setError(result.error ?? result.refusalReason ?? result.clarifications?.[0] ?? "Could not parse mandate.");
        setStep("intent");
        return;
      }
      const createResponse = await fetch("/api/mandates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner: result.mandate.owner,
          intent: result.mandate.purpose,
          mandate: { ...result.mandate, version: 1, status: "DRAFT" }
        })
      });
      const created = await readJson<{ mandate?: MandateDraft; error?: string }>(createResponse);
      if (!createResponse.ok || !created.mandate) {
        throw new Error(created.error ?? "Draft mandate could not be saved.");
      }
      setDraft(created.mandate);
      setClarifications(
        (result.clarifications ?? []).map((msg, i) => ({ field: `clarification-${i}`, message: msg }))
      );
      setMessage("Draft parsed and saved. Review and customize the limits below, then confirm to activate.");
      setStep("review");
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && (err.name === "AbortError" || err.message.toLowerCase().includes("abort") || err.message.toLowerCase().includes("timeout"));
      const errorMessage = isTimeout
        ? "AI mandate parsing timed out after 20 seconds. Please check your instructions and try again."
        : (err instanceof Error ? err.message : "Could not parse the mandate.");
      setError(errorMessage);
      setMessage("");
      setStep("intent");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [owner, purpose]);

  const updateDraft = useCallback((field: keyof MandateDraft, value: unknown) => {
    if (!draft) return;
    setDraft((prev) => ({ ...prev, [field]: value } as MandateDraft));
  }, [draft]);

  const confirmMandate = () => {
    if (!draft) return;
    setError(null);
    setShowConfirmDialog(true);
    setStep("confirm");
  };

  const executeConfirm = async () => {
    if (!draft) return;
    setLoading(true);
    setError(null);
    suppressAutoSave.current = true;
    try {
      const pending = await persistDraft({
        ...draft,
        period: { type: "monthly", budget: Number(draft.period.budget) },
        caps: {
          perItem: draft.caps.perItem !== null ? Number(draft.caps.perItem) : null,
          perTransaction: draft.caps.perTransaction ?? 80,
          maxQuantityPerItem: draft.caps.maxQuantityPerItem ?? 4
        },
        askAbove: draft.askAbove !== null ? Number(draft.askAbove) : null
      });
      const response = await fetch(`/api/mandates/${pending.id}/confirm`, { method: "POST" });
      const result = await readJson<{ mandate?: MandateDraft; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        throw new Error(result.error ?? "Could not activate mandate.");
      }
      setShowConfirmDialog(false);
      setDraft(result.mandate);
      setMessage("Mandate is ACTIVE and ready for governed runs.");
      setStep("success");
    } catch (err) {
      setShowConfirmDialog(false);
      setError(err instanceof Error ? err.message : "Could not activate mandate.");
      setStep("confirm");
    } finally {
      suppressAutoSave.current = false;
      setLoading(false);
    }
  };

  const revokeMandate = async () => {
    if (!draft) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/mandates/${draft.id}/revoke`, { method: "POST" });
      const result = await readJson<{ mandate?: MandateDraft; error?: string }>(response);
      if (!response.ok || !result.mandate) {
        throw new Error(result.error ?? "Could not revoke mandate.");
      }
      setDraft(result.mandate);
      setMessage("Mandate REVOKED. Future payments are blocked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke mandate.");
    } finally {
      setLoading(false);
    }
  };

  const progressBar = (currentStepIndex / (stepOrder.length - 1)) * 100;

  return (
    <div className="page-container">
      <PageHeader
        title={draft?.previousVersionId ? "Amend Mandate" : "Create a Mandate"}
        subtitle="Describe what your agent may buy. Steward turns plain English into explicit limits before anything can be paid."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Create Mandate", href: "/new" }]}
      />

      {/* Step Progress */}
      <div className="content-section mb-8">
        <div className="w-full bg-surface rounded-lg border border-border p-4 mb-4">
          <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${progressBar}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-secondary">
            {stepOrder.map((s, i) => (
              <span key={s} className={`text-xs font-medium ${i <= currentStepIndex ? "text-text-primary" : "text-text-muted"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            ))}
          </div>
        </div>

        {step === "intent" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-text-primary">Owner Email</label>
              <Input
                label="Owner email"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="you@example.com"
                required
                error={error && step === "intent" ? "Owner email is required." : undefined}
              />
              <label className="block text-sm font-semibold text-text-primary">Purchasing Instructions</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Reorder printer paper and coffee for my studio; max $120 a month; nothing over $40 per item; ask me above $60."
                rows={6}
                className="block w-full rounded-md border border-border bg-surface-elevated text-text-primary focus:border-border-focus focus:outline-none"
                required
              />
              <p className="text-xs text-text-secondary">
                Specify monthly budget, per-item cap, and human approval threshold.
              </p>
              {error && <p className="text-xs text-error">{error}</p>}
              <Button variant="primary" onClick={parseMandate} disabled={loading || !owner || !purpose}>
                {loading ? "Parsing..." : "Parse Mandate"}
              </Button>
            </div>
            <div className="bg-surface-elevated rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold text-text-primary mb-3">Example Intent</h4>
              <p className="text-sm text-text-secondary">
                &quot;Buy office stationery for my team. Maximum $120 per month. Nothing over $40 per item. Ask me above $60.&quot;
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-950/20 text-red-200 text-sm flex items-start justify-between gap-3 shadow-md" role="alert">
            <div className="flex items-start gap-2.5">
              <span className="text-base text-red-400">⚠️</span>
              <div>
                <p className="font-semibold text-red-300">Mandate Parsing Error</p>
                <p className="text-xs text-red-200/90 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400 hover:text-red-200 p-1 rounded transition cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {step === "parsing" && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {loading ? (
              <>
                <LoadingSkeleton width="64" height="64" className="mx-auto mb-4 rounded-full" />
                <p className="text-text-secondary">{message || "Parsing mandate..."}</p>
              </>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <p className="text-sm text-red-400">{error || "Mandate parsing could not complete."}</p>
                <Button variant="secondary" onClick={() => { setStep("intent"); setError(null); }}>
                  ← Return to Instructions
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "review" && draft && (
          <div className="space-y-6">
            <div className="bg-surface-elevated rounded-lg p-5 border border-border">
              <h4 className="text-sm font-semibold text-text-primary mb-4">Review & Edit Draft</h4>
              <div role="status" className={`mb-4 text-xs ${draftSaveState === "error" ? "text-error" : "text-text-muted"}`}>
                {draftSaveState === "saving" && "Saving draft edits…"}
                {draftSaveState === "saved" && "Draft saved"}
                {draftSaveState === "error" && "Draft could not be saved. Correct the issue and retry."}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Monthly Budget ($)</label>
                  <input
                    type="number"
                    value={draft.period.budget}
                    onChange={(e) => updateDraft("period", { ...draft.period, budget: Number(e.target.value) })}
                    className="w-full rounded-md border border-border bg-surface text-text-primary px-3 py-2 focus:border-border-focus focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Per-Item Cap ($)</label>
                  <input
                    type="number"
                    value={draft.caps.perItem ?? 0}
                    onChange={(e) => updateDraft("caps", { ...draft.caps, perItem: Number(e.target.value) || null })}
                    className="w-full rounded-md border border-border bg-surface text-text-primary px-3 py-2 focus:border-border-focus focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Ask Human Above ($)</label>
                  <input
                    type="number"
                    value={draft.askAbove ?? 0}
                    onChange={(e) => updateDraft("askAbove", Number(e.target.value) || null)}
                    className="w-full rounded-md border border-border bg-surface text-text-primary px-3 py-2 focus:border-border-focus focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Max Quantity Per Item</label>
                  <input
                    type="number"
                    value={draft.caps.maxQuantityPerItem}
                    onChange={(e) => updateDraft("caps", { ...draft.caps, maxQuantityPerItem: Number(e.target.value) })}
                    className="w-full rounded-md border border-border bg-surface text-text-primary px-3 py-2 focus:border-border-focus focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-text-secondary mb-1">Allowed Categories</label>
                <div className="flex flex-wrap gap-2">
                  {draft.categories.map((cat) => (
                    <span key={cat} className="px-2 py-1 rounded-md border border-border bg-surface text-xs text-text-secondary">
                      {cat.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              {clarifications.length > 0 && (
                <div className="mt-4 p-3 rounded-md border border-warning/30 bg-warning/10">
                  <h5 className="text-xs font-semibold text-warning mb-1">Clarifications Needed</h5>
                  <ul className="text-xs text-text-secondary space-y-1">
                    {clarifications.map((c) => (
                      <li key={c.field}>• {c.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("intent")}>Back</Button>
              <Button variant="primary" onClick={() => setStep("risk")}>Continue to Risk Review</Button>
            </div>
          </div>
        )}

        {step === "risk" && draft && (
          <div className="space-y-6">
            <div className="bg-surface-elevated rounded-lg p-5 border border-border">
              <h4 className="text-sm font-semibold text-text-primary mb-4">Risk Review</h4>
              <p className="text-sm text-text-secondary mb-4">
                Before activating, review how these limits will govern your agent&apos;s purchasing decisions.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-md border border-success/30 bg-success/10">
                  <span className="text-success">✓</span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Per-Item Cap: ${draft.caps.perItem}</p>
                    <p className="text-xs text-text-secondary">No single item can exceed this amount without a block.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md border border-warning/30 bg-warning/10">
                  <span className="text-warning">◐</span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Approval Threshold: ${draft.askAbove}</p>
                    <p className="text-xs text-text-secondary">Purchases above this amount require human approval before payment.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md border border-primary/30 bg-primary/10">
                  <span className="text-primary">ℹ</span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Monthly Budget: ${draft.period.budget}</p>
                    <p className="text-xs text-text-secondary">Total spending across all purchases is capped per month.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("review")}>Back</Button>
              <Button variant="primary" onClick={confirmMandate}>Continue to Confirmation</Button>
            </div>
          </div>
        )}

        {step === "confirm" && draft && (
          <div className="space-y-6">
            <div className="bg-surface-elevated rounded-lg p-6 border border-border">
              <h4 className="text-base font-semibold text-text-primary mb-2">Final Confirmation & Activation</h4>
              <p className="text-sm text-text-secondary mb-6">
                You are activating mandate &quot;<strong className="text-text-primary">{draft.purpose}</strong>&quot;.
                Once confirmed, these spending caps will be cryptographically anchored to the SHA-256 audit ledger.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-md border border-border bg-surface">
                  <p className="text-xs text-text-secondary">Per-Item Limit</p>
                  <p className="text-xl font-bold text-text-primary mt-1">${draft.caps.perItem ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Rule R04 hard block</p>
                </div>
                <div className="p-4 rounded-md border border-border bg-surface">
                  <p className="text-xs text-text-secondary">Approval Threshold</p>
                  <p className="text-xl font-bold text-text-primary mt-1">${draft.askAbove ?? 0}</p>
                  <p className="text-xs text-text-muted mt-1">Rule R06 human review</p>
                </div>
                <div className="p-4 rounded-md border border-border bg-surface">
                  <p className="text-xs text-text-secondary">Monthly Budget</p>
                  <p className="text-xl font-bold text-text-primary mt-1">${draft.period.budget}</p>
                  <p className="text-xs text-text-muted mt-1">Rule R05 period cap</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep("risk")}>
                  ← Back to Risk Review
                </Button>
                <Button variant="primary" onClick={executeConfirm} disabled={loading}>
                  {loading ? "Activating Mandate..." : "✓ Confirm & Activate Mandate"}
                </Button>
              </div>
            </div>

            <ConfirmationDialog
              isOpen={showConfirmDialog}
              title="Activate Mandate"
              description={`Confirming will activate mandate "${draft.purpose}" with the spending limits shown above. Once active, your agent can make purchases within these boundaries.`}
              confirmLabel={loading ? "Activating..." : "Activate Mandate"}
              confirmVariant="success"
              onConfirm={executeConfirm}
              onCancel={() => setShowConfirmDialog(false)}
            />
          </div>
        )}

        {step === "success" && draft && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mb-6">
              <span className="text-primary-text font-bold text-xl">✓</span>
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">Mandate Activated</h3>
            <p className="text-lg text-text-secondary mb-6">
              Your mandate is now active and ready for governed purchases.
            </p>
            <div className="bg-surface-elevated rounded-lg p-6 border border-border w-full max-w-md">
              <p className="text-xs font-semibold text-text-secondary mb-2">Mandate ID</p>
              <p className="text-sm font-mono text-text-primary mb-4">{draft.id}</p>
              <p className="text-xs font-semibold text-text-secondary mb-2">Status</p>
              <StatusBadge status={draft.status as any} />
              <p className="text-xs font-semibold text-text-secondary mt-4 mb-2">Confirmed Fingerprint</p>
              <p className="text-sm font-mono text-text-primary" title={draft.fingerprint ?? undefined}>
                {draft.fingerprint ? `${draft.fingerprint.slice(0, 12)}…` : "Fingerprint protection disabled"}
              </p>
              <p className="text-xs font-semibold text-text-secondary mt-4 mb-2">Monthly Budget</p>
              <p className="text-sm text-text-primary">${draft.period.budget}</p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="primary" asChild>
                <Link href={`/dashboard?mandateId=${draft.id}`}>🚀 Open Control Room & Run Purchase</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/redteam">🛡️ Open Red-Team Lab</Link>
              </Button>
              <Button variant="secondary" size="sm" onClick={revokeMandate}>
                Revoke Mandate
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && step !== "success" && (
        <p className="mt-4 text-sm text-success">{message}</p>
      )}
      {error && step !== "parsing" && (
        <p className="mt-4 text-sm text-error">{error}</p>
      )}
    </div>
  );
}
