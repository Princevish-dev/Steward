"use client";

import * as React from "react";

type ErrorStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  retry?: () => void;
};

export function ErrorState({ title, description, action, retry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-error bg-error-bg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-error">{title}</h3>
      {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
      <div className="mt-4 flex gap-2">
        {retry && (
          <button
            onClick={retry}
            className="rounded-md border border-border bg-surface text-text-primary px-3 py-1.5 text-xs font-medium hover:bg-surface-focus focus-visible-outline"
          >
            Retry
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
