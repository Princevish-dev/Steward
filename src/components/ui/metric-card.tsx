"use client";

import * as React from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  description?: string;
};

export function MetricCard({ title, value, delta, deltaPositive, description }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
      <p className="text-xs text-text-muted">{title}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-text-primary">{value}</span>
        {delta && (
          <span className={`text-xs font-medium ${deltaPositive ? "text-success" : "text-error"}`}>
            {deltaPositive ? "+" : ""}{delta}
          </span>
        )}
      </div>
      {description && <p className="mt-2 text-xs text-text-secondary">{description}</p>}
    </div>
  );
}
