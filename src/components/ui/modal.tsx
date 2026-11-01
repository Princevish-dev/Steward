"use client";

import * as React from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  closeLabel?: string;
};

export function Modal({ isOpen, onClose, title, description, children, closeLabel = "Close" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-elevated shadow-lg p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
      >
        {title && (
          <h2 id="modal-title" className="text-lg font-semibold text-text-primary mb-2">
            {title}
          </h2>
        )}
        {description && (
          <p id="modal-description" className="text-sm text-text-secondary mb-6">
            {description}
          </p>
        )}
        <div>{children}</div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-border bg-surface text-text-primary py-2 text-sm font-medium hover:bg-surface-focus focus-visible-outline"
        >
          {closeLabel}
        </button>
      </div>
    </>
  );
}
