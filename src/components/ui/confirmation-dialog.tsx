"use client";

import * as React from "react";

type ConfirmationDialogProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary" | "success";
  cancelLabel?: string;
};

export function ConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  cancelLabel = "Cancel"
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        role="presentation"
      />
      <div
        className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-elevated shadow-lg p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-text-primary mb-2">
          {title}
        </h2>
        <p className="text-sm text-text-secondary mb-6">{description}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-md border border-border bg-surface text-text-secondary py-2 text-sm font-medium hover:bg-surface-focus focus-visible-outline"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium focus-visible-outline ${
              confirmVariant === "danger" ? "bg-error text-error-bg hover:bg-error" : "bg-primary text-primary-text hover:bg-primary-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
