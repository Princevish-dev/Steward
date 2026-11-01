"use client";

import * as React from "react";
import { StatusBadge } from "./status-badge";

type DecisionCardProps = {
  decision: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK";
  total?: number;
  title?: string;
  description?: string;
  ruleResults?: Array<{ id: string; passed: boolean; reason: string }>;
  onApprove?: () => void;
  onReject?: () => void;
  canApprove?: boolean;
  canReject?: boolean;
};

const decisionConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  AUTO_APPROVE: { label: "Auto-Approved", color: "#6ee7b7", bg: "#173b35", icon: "✓" },
  ASK_HUMAN: { label: "Awaiting Approval", color: "#f0c674", bg: "#2a2015", icon: "◐" },
  BLOCK: { label: "Blocked", color: "#ff7b8b", bg: "#2a151b", icon: "✕" }
};

export function DecisionCard({
  decision,
  total,
  title,
  description,
  ruleResults,
  onApprove,
  onReject,
  canApprove = false,
  canReject = false
}: DecisionCardProps) {
  const config = decisionConfig[decision];

  return (
    <div className={`rounded-lg border border-border p-6 shadow-sm ${decision === "BLOCK" ? "border-error bg-error-bg" : decision === "ASK_HUMAN" ? "border-warning bg-warning-bg" : "border-success bg-success-bg"}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title ?? config.label}</h3>
          <span className={`inline-flex items-center gap-2 mt-2 rounded-full border px-3 py-1 text-xs font-medium`} style={{ borderColor: config.color, color: config.color }}>
            {config.icon} {config.label}
          </span>
          {total !== undefined && (
            <p className="mt-1 text-sm text-text-secondary">Total: ${total.toFixed(2)}</p>
          )}
          {description && <p className="mt-2 text-sm text-text-secondary">{description}</p>}
        </div>
        <div className="flex gap-2">
          {canApprove && onApprove && (
            <button
              onClick={onApprove}
              className="rounded-md bg-success text-primary-text px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve
            </button>
          )}
          {canReject && onReject && (
            <button
              onClick={onReject}
              className="rounded-md bg-error text-error-bg px-4 py-2 text-sm font-medium hover:bg-error disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          )}
        </div>
      </div>
      {ruleResults && ruleResults.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Policy Rules</h4>
          <div className="grid gap-2">
            {ruleResults.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-surface">
                <span className="text-xs text-text-secondary">{rule.id}</span>
                <span className={`text-xs font-medium ${rule.passed ? "text-success" : "text-error"}`}>
                  {rule.passed ? "PASS" : "FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
