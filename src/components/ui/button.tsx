"use client";

import * as React from "react";
import Link from "next/link";

type ButtonOwnProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isDisabled?: boolean;
  asChild?: boolean;
  href?: string;
  onClick?: () => void;
};

const variantStyles: Record<string, string> = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover focus-visible-outline disabled:opacity-50 disabled:cursor-not-allowed",
  secondary: "bg-surface-elevated border border-border hover:bg-surface focus-visible-outline disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "text-text-secondary hover:bg-surface-elevated focus-visible-outline disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "bg-error text-error-bg hover:bg-error focus-visible-outline disabled:opacity-50 disabled:cursor-not-allowed",
  success: "bg-success text-primary-text hover:bg-secondary focus-visible-outline disabled:opacity-50 disabled:cursor-not-allowed"
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base"
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  className = "",
  asChild = false,
  href,
  onClick,
  ...props
}: ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const handleClick = (event: React.MouseEvent) => {
    if (isDisabled || isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.();
  };

  const baseClass = `inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (asChild || href) {
    return (
      <Link
        href={href ?? "#"}
        onClick={handleClick}
        className={baseClass}
        {...(props as Record<string, unknown>)}
      >
        {isLoading && (
          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={isDisabled || isLoading}
      onClick={handleClick}
      className={baseClass}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
