"use client";

import * as React from "react";

type StatusBadgeProps = {
  status: "AUTO_APPROVE" | "ASK_HUMAN" | "BLOCK" | "ACTIVE" | "REVOKED" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "COMPLETED" | "FAILED" | "REFUNDED";
  size?: "sm" | "md";
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  AUTO_APPROVE: { bg: "#173b35", text: "#6ee7b7", border: "#1e5a52" },
  ASK_HUMAN: { bg: "#2a2015", text: "#f0c674", border: "#5a4a1d" },
  BLOCK: { bg: "#2a151b", text: "#ff7b8b", border: "#5a2a2d" },
  ACTIVE: { bg: "#173b35", text: "#6ee7b7", border: "#1e5a52" },
  REVOKED: { bg: "#2a151b", text: "#ff7b8b", border: "#5a2a2d" },
  DRAFT: { bg: "#1c2438", text: "#b8c0d9", border: "#293252" },
  PENDING: { bg: "#2a2015", text: "#f0c674", border: "#5a4a1d" },
  APPROVED: { bg: "#173b35", text: "#6ee7b7", border: "#1e5a52" },
  REJECTED: { bg: "#2a151b", text: "#ff7b8b", border: "#5a2a2d" },
  EXPIRED: { bg: "#1c2438", text: "#8b9cff", border: "#293252" },
  COMPLETED: { bg: "#173b35", text: "#6ee7b7", border: "#1e5a52" },
  FAILED: { bg: "#2a151b", text: "#ff7b8b", border: "#5a2a2d" },
  REFUNDED: { bg: "#173b35", text: "#8b9cff", border: "#2e4a7a" }
};

export function StatusBadge({ status, size = "sm" }: { status?: string | null; size?: "sm" | "md" }) {
  const safeStatus = status ?? "DRAFT";
  const colors = statusColors[safeStatus] ?? statusColors.DRAFT;
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full ${padding} border ${textSize} font-medium`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
    >
      {(status ? String(status) : "—").replace(/_/g, " ")}
    </span>
  );
}
