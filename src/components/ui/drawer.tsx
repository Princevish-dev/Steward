"use client";

import * as React from "react";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placement?: "left" | "right";
  children: React.ReactNode;
};

export function Drawer({ isOpen, onClose, title, placement = "right", children }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm ${placement === "right" ? "cursor-pointer" : ""}`}
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`fixed inset-y-0 z-50 w-full max-w-md border-l border-border bg-surface-elevated shadow-lg p-6 transform transition-transform duration-300 ${
          placement === "right" ? "right-0 translate-x-full" : "-left-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{ transform: isOpen ? "translateX(0)" : placement === "right" ? "translateX(100%)" : "translateX(-100%)" }}
      >
        {title && (
          <div className="flex justify-between items-start mb-4">
            <h2 id="drawer-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary focus-visible-outline">
              ✕
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </>
  );
}
