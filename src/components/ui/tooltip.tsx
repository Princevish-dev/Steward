"use client";

import * as React from "react";

type TooltipProps = {
  children: React.ReactElement;
  label: string;
  disabled?: boolean;
};

export function Tooltip({ children, label, disabled = false }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span
      onMouseEnter={() => !disabled && setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => !disabled && setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {React.cloneElement(children as React.ReactElement, Object.assign({}, (children as React.ReactElement).props, { "aria-describedby": isOpen ? id : undefined }))}
      {isOpen && !disabled && (
        <div
          id={id}
          role="tooltip"
          className="absolute z-50 px-2 py-1 rounded-md bg-surface text-text-primary text-xs text-center whitespace-nowrap border border-border shadow-lg"
          style={{ position: "absolute", zIndex: 50 }}
        >
          {label}
        </div>
      )}
    </span>
  );
}
