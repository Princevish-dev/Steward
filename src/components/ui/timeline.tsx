"use client";

import * as React from "react";

type TimelineItem = {
  title: string;
  description?: string;
  time?: string;
  status?: "pending" | "completed" | "active" | "error";
};

type TimelineProps = {
  items: TimelineItem[];
  vertical?: boolean;
};

export function Timeline({ items, vertical = true }: TimelineProps) {
  return (
    <div className={`relative ${vertical ? "pl-8" : "pb-8"}`}>
      {vertical && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const statusColors: Record<string, string> = {
          pending: "#8b9cff",
          completed: "#6ee7b7",
          active: "#f0c674",
          error: "#ff7b8b"
        };
        return (
          <div key={item.title} className="mb-6 relative last:mb-0">
            {!vertical && <div className="absolute bottom-0 left-0 -top-8 w-0.5 bg-border" />}
            <div className="flex items-center gap-3">
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface text-text-secondary">
                {item.status === "completed" ? "✓" : item.status === "active" ? "◐" : String(index + 1)}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-semibold ${item.status === "active" ? "text-primary" : "text-text-primary"}`}>
                  {item.title}
                </h4>
                {item.time && <p className="text-xs text-text-muted">{item.time}</p>}
                {item.description && <p className="text-xs text-text-secondary">{item.description}</p>}
              </div>
            </div>
            {!isLast && vertical && <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
