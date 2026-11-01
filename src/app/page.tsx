import Link from "next/link";

const featureSteps = [
  {
    number: "1",
    title: "Define a Mandate",
    description: "Set spending limits, allowed categories, merchant rules, and approval thresholds in plain English."
  },
  {
    number: "2",
    title: "AI Proposes",
    description: "Your agent searches catalog and proposes a cart. Product text is quarantined — it can never override your rules."
  },
  {
    number: "3",
    title: "Policy Decides",
    description: "13 deterministic rules evaluate every purchase: caps, budget, velocity, merchant allow/deny, and more."
  },
  {
    number: "4",
    title: "PayPal Executes",
    description: "Only approved decisions reach PayPal Sandbox. Every capture, refund, and webhook is cryptographically recorded."
  },
  {
    number: "5",
    title: "Ledger Proves",
    description: "SHA-256 hash-chained audit trail makes every state transition tamper-evident and verifiable."
  }
];

const decisionStates = [
  {
    label: "AUTO_APPROVE",
    description: "Purchase passes all 13 policy rules. Payment is authorized immediately.",
    color: "#173b35",
    text: "#6ee7b7"
  },
  {
    label: "ASK_HUMAN",
    description: "Purchase exceeds a threshold or triggers a review rule. Human approval required before payment.",
    color: "#2a2015",
    text: "#f0c674"
  },
  {
    label: "BLOCK",
    description: "Purchase violates a hard policy rule (cap, budget, merchant, category). Payment is rejected.",
    color: "#2a151b",
    text: "#ff7b8b"
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative px-4 py-16 lg:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-6">
              Steward AI
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary tracking-tight mb-6 leading-tight">
              Give your AI agent a mandate, not your credit card.
            </h1>
            <p className="text-lg lg:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Autonomous shopping. Deterministic spending rules. Human control. Every decision is recorded in a tamper-evident SHA-256 audit ledger.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-text font-semibold text-lg hover:bg-primary-hover transition-colors"
              >
                Launch Control Room →
              </Link>
              <Link
                href="/new"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-border bg-surface text-text-secondary font-semibold text-lg hover:text-text-primary hover:bg-surface-elevated transition-colors"
              >
                Create a Mandate
              </Link>
            </div>
          </div>

          {/* Decision States Preview */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {decisionStates.map((state) => (
              <div key={state.label} className={`rounded-lg border p-6 ${state.color}`}>
                <span className="inline-block mb-4 px-3 py-1 rounded-full border border-current text-current text-xs font-semibold uppercase tracking-wider">
                  {state.label}
                </span>
                <h3 className="text-lg font-semibold text-text-primary mb-3">{state.label.replace(/_/g, " ")}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{state.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">How Steward Works</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              From natural-language intent to verified audit entry — every step is governed, transparent, and auditable.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {featureSteps.map((step) => (
              <div key={step.number} className="rounded-lg border p-6 bg-surface-elevated">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-primary text-primary font-bold mb-4">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-text-primary mb-3">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PayPal Integration */}
      <section className="px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-text-primary mb-6">PayPal-Powered Payment Flow</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Payments execute exclusively through PayPal Sandbox Orders API v2. No payment is created without a server-side policy decision. Buyer approval is required before capture.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-success text-primary-text text-xs font-bold">1</span>
                  <div>
                    <h4 className="font-semibold text-text-primary">Policy Gate</h4>
                    <p className="text-sm text-text-secondary">Every order is checked against deterministic rules before PayPal is called.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-success text-primary-text text-xs font-bold">2</span>
                  <div>
                    <h4 className="font-semibold text-text-primary">Buyer Approval</h4>
                    <p className="text-sm text-text-secondary">The buyer approves the order in PayPal Sandbox checkout.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-success text-primary-text text-xs font-bold">3</span>
                  <div>
                    <h4 className="font-semibold text-text-primary">Capture & Ledger</h4>
                    <p className="text-sm text-text-secondary">Capture is recorded with simulated tracking and appended to the SHA-256 ledger.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-elevated p-6">
              <h4 className="text-sm font-semibold text-text-primary mb-4">Transparent Limitations</h4>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-error">⚠</span>
                  PayPal Vault (approve-once payments) is not available in Sandbox due to developer account permissions. Each order requires explicit buyer approval.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning">ℹ</span>
                  Fulfilment tracking uses a simulated carrier (SIMULATED_CARRIER) for development clarity.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-info">ℹ</span>
                  Channel3 product search uses fixtures when no API key is configured; live search when CHANNEL3_API_KEY is set.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 bg-surface-elevated border-y border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-6">Ready to govern your AI agent?</h2>
          <p className="text-lg text-text-secondary mb-10">
            Start with a mandate. Let AI propose. Let policy decide. Let PayPal execute. Let the ledger prove.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-text font-semibold text-lg hover:bg-primary-hover transition-colors"
            >
              Launch Control Room
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-border bg-surface text-text-secondary font-semibold text-lg hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              Create Your First Mandate
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="font-bold text-text-primary">Steward AI</span>
            </div>
            <p className="text-xs text-text-muted">
              Mandate-governed autonomous purchasing platform. Built for hackathon demonstration.
            </p>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between gap-4 text-xs text-text-muted">
            <div>
              <p>PayPal Sandbox • SHA-256 Ledger • Neon PostgreSQL • Model Context Protocol</p>
            </div>
            <div className="flex gap-6">
              <Link href="/redteam" className="hover:text-primary focus-visible-outline">Red-Team Lab</Link>
              <Link href="/api/openapi" className="hover:text-primary focus-visible-outline">API Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
