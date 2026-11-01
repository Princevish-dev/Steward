"use client";

import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
};

export function Select({
  label,
  error,
  helperText,
  required,
  className = "",
  ...props
}: SelectProps) {
  const id = React.useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%" }}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}{required && <span style={{ color: "#f0c674" }}>*</span>}
        </label>
      )}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={`block w-full rounded-md border border-border bg-surface-elevated text-text-primary focus:border-border-focus focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-error" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-xs text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}
