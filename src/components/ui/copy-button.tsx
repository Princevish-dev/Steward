"use client";

import * as React from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: "sm" | "md";
};

export function CopyButton({ value, label = "Copy", copiedLabel = "Copied!", size = "sm" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const btnSize = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 rounded-md border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-focus focus-visible-outline ${btnSize}`}
      title="Copy to clipboard"
    >
      {isCopied ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
