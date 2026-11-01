"use client";

import * as React from "react";

type ActivityItem = {
  title: string;
  description?: string;
  time?: string;
  status?: "success" | "warning" | "error" | "info";
};

type ActivityFeedProps = {
  items: ActivityItem[];
  title?: string;
};

export function ActivityFeed({ items, title }: ActivityFeedProps) {
  const statusColors: Record<string, string> = {
    success: "#6ee7b7",
    warning: "#f0c674",
    error: "#ff7b8b",
    info: "#8b9cff"
  };

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      {title && <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={item.title} className="flex gap-3">
            <div className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors[item.status ?? "info"] }} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-text-primary">{item.title}</p>
              {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
              {item.time && <span className="text-xs text-text-muted">{item.time}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
