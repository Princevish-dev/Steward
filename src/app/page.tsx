import Link from "next/link";

const architectureSteps = [
  {
    step: "01",
    title: "Define a Mandate",
    description: "Specify spending limits, allowed merchant categories, per-item caps, and human escalation thresholds in natural language.",
    icon: "📋"
  },
  {
    step: "02",
    title: "AI Cart Proposal",
    description: "Autonomous shopper agent locates items and proposes a cart. External text is strictly quarantined from overriding governance rules.",
    icon: "🛒"
  },
  {
    step: "03",
    title: "13 Deterministic Rules",
    description: "The zero-hallucination policy engine checks caps, remaining monthly budget, 24h velocity, and merchant allowlists with escalate-only invariants.",
    icon: "⚖️"
  },
  {
    step: "04",
    title: "PayPal Settlement",
    description: "Approved orders execute through PayPal Sandbox Orders API v2. Captures, refunds, and webhooks are cryptographically authenticated.",
    icon: "💳"
  },
  {
    step: "05",
    title: "Immutable Ledger",
    description: "Every state transition is cryptographically linked with SHA-256 prev_hash chaining and persisted to PostgreSQL for tamper-evident auditing.",
    icon: "🔗"
  }
];

const decisionCards = [
  {
    status: "AUTO_APPROVE",
    title: "Autonomous Execution",
    badgeBg: "bg-emerald-950/60 text-emerald-300 border-emerald-700/50",
    example: "Cart $28.00 • Office Supplies",
    description: "Passes all 13 deterministic policy rules within pre-authorized budget. PayPal order created and captured seamlessly without interrupting the user."
  },
  {
    status: "ASK_HUMAN",
    title: "Human Escalation Gate",
    badgeBg: "bg-amber-950/60 text-amber-300 border-amber-700/50",
    example: "Cart $78.00 • Threshold $60.00",
    description: "Exceeds the mandate's askAbove threshold or triggers velocity caution. Payment holds until human reviewer approves or rejects with full audit trail."
  },
  {
    status: "BLOCK",
    title: "Hard Policy Rejection",
    badgeBg: "bg-rose-950/60 text-rose-300 border-rose-700/50",
    example: "Cart $180.00 • Budget $120.00",
    description: "Violates a hard boundary (budget exceeded, per-item cap breached, or unapproved category). Hard reject recorded in ledger; zero payment created."
  }
];

const platformPillars = [
  {
    title: "13 Deterministic Rules",
    metric: "100%",
    subtitle: "Zero Hallucination",
    detail: "Hard mathematical constraints govern spending. AI can propose purchases, but code alone decides whether to approve, hold, or reject."
  },
  {
    title: "PayPal Sandbox API v2",
    metric: "Live",
    subtitle: "Real Settlement",
    detail: "Full buyer checkout flow, captured payments, live refund execution, and cryptographic webhook signature verification."
  },
  {
    title: "SHA-256 Audit Trail",
    metric: "Tamper-Evident",
    subtitle: "Cryptographic Ledger",
    detail: "Every transition is stored with previous-hash linkage in PostgreSQL, exportable in CSV and JSON verification format."
  },
  {
    title: "Multi-Tenant Isolation",
    metric: "Stateless JWT",
    subtitle: "Enterprise Scaling",
    detail: "Horizontally scalable stateless HMAC authentication with strict user-level data isolation on mandates, runs, and ledger entries."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Top Banner */}
      <div className="border-b border-border/60 bg-surface/40 px-4 py-2 text-center text-xs text-text-secondary">
        <span>🛡️ Built for the </span>
        <strong className="text-text-primary">PayPal AI Hackathon 2026</strong>
        <span> — Autonomous Shopping with User Control</span>
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-8 backdrop-blur-sm">
            <span>🛡️</span>
            <span>Deterministic AI Governance & PayPal Commerce</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-text-primary leading-[1.1] mb-6">
            Give your AI agent a mandate, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-300 to-secondary">
              not your credit card.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed">
            Autonomous shopping with deterministic human control. Set natural-language spending caps,
            velocity limits, and merchant rules. Every purchase is policy-verified, PayPal-settled,
            and permanently recorded in an immutable SHA-256 audit ledger.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-semibold text-base transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <span>Sign In to Platform</span>
              <span>→</span>
            </Link>
            <Link
              href="/api-docs"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border border-border bg-surface/70 hover:bg-surface-elevated text-text-secondary hover:text-text-primary font-medium text-base transition-colors"
            >
              <span>View API Documentation</span>
            </Link>
          </div>

          {/* Quick Pillars Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left">
            {platformPillars.map((pillar) => (
              <div key={pillar.title} className="rounded-xl border border-border bg-surface/60 backdrop-blur-sm p-5">
                <div className="text-xs uppercase font-bold tracking-wider text-text-muted mb-1">{pillar.subtitle}</div>
                <div className="text-xl lg:text-2xl font-bold text-text-primary mb-2">{pillar.metric}</div>
                <div className="text-xs text-text-secondary leading-relaxed">{pillar.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tri-State Policy Evaluation Visualizer */}
      <section className="px-4 py-16 border-y border-border bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3">
              Deterministic Tri-State Decision Engine
            </h2>
            <p className="text-sm sm:text-base text-text-secondary">
              LLMs propose candidate purchases, but never make payment decisions. 13 hard-coded rules classify every intent into exactly one deterministic outcome.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {decisionCards.map((card) => (
              <div key={card.status} className="rounded-xl border border-border bg-surface-elevated p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-full border text-xs font-bold tracking-wide uppercase ${card.badgeBg}`}>
                      {card.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">{card.title}</h3>
                  <div className="text-xs font-mono text-text-muted mb-3 bg-surface px-2.5 py-1.5 rounded border border-border">
                    {card.example}
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* End-to-End Governance Architecture */}
      <section className="px-4 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3">
              End-to-End Governance Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-text-secondary">
              From natural language instruction to settled PayPal order and permanent cryptographic receipt.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {architectureSteps.map((item) => (
              <div key={item.step} className="rounded-xl border border-border bg-surface/80 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-mono font-bold text-primary">{item.step}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">{item.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Verification Callout */}
      <section className="px-4 py-16 border-t border-border bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/40 bg-secondary/10 text-secondary text-xs font-semibold mb-4">
                <span>🔒</span>
                <span>Security First Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 leading-tight">
                Cryptographic Integrity & Isolated Tenant Security
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mb-6 leading-relaxed">
                Steward enforces strict authorization boundaries at every layer. User sessions are stateless and cryptographically signed with HMAC-SHA256. Database mandates, purchase runs, and ledger transitions are strictly isolated by authenticated account ID.
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-text-secondary">
                <div className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  <span><strong>Zero Prompt Injection Bypass:</strong> Cart proposals are strictly quarantined data objects; LLM prompt output cannot alter policy thresholds.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  <span><strong>Tamper-Evident Ledger:</strong> Every event stores the SHA-256 hash of its predecessor, verifiable with mathematical certainty.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  <span><strong>PayPal Webhook Verification:</strong> Inbound webhooks are cryptographically authenticated via PayPal API before state transitions occur.</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  Live Platform Status
                </span>
                <span className="text-xs font-mono text-text-muted">SANDBOX READY</span>
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/40 text-text-secondary">
                  <span>Policy Invariants</span>
                  <span className="text-success font-semibold">13/13 Active</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40 text-text-secondary">
                  <span>Settlement Rail</span>
                  <span className="text-text-primary">PayPal Orders v2</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40 text-text-secondary">
                  <span>Ledger Persistence</span>
                  <span className="text-text-primary">Neon PostgreSQL (SHA-256)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40 text-text-secondary">
                  <span>Session Security</span>
                  <span className="text-text-primary">Stateless HMAC-SHA256</span>
                </div>
                <div className="flex justify-between py-1.5 text-text-secondary">
                  <span>Model Context Protocol</span>
                  <span className="text-primary font-semibold">Mandate-Scoped Server</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <Link
                  href="/login"
                  className="block text-center py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-primary-text font-semibold text-sm transition cursor-pointer"
                >
                  Sign In to Control Room →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <span className="font-semibold text-text-primary">Steward AI</span>
            <span>• Mandate-governed autonomous purchasing platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-text-primary transition">Login</Link>
            <Link href="/api-docs" className="hover:text-text-primary transition">API Docs</Link>
            <Link href="/api/openapi" className="hover:text-text-primary transition">OpenAPI</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
