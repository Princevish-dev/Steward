"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
};

export function Input({
  label,
  error,
  helperText,
  required,
  className = "",
  ...props
}: InputProps) {
  const id = React.useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%" }}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}{required && <span style={{ color: "#f0c674", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={helperText ? `${id}-helper` : undefined}
        className={`block w-full rounded-md border border-border bg-surface-elevated text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-error" : ""} ${className}`}
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
