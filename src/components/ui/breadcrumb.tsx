"use client";

import * as React from "react";

type BreadcrumbItem = { label: string; href: string };

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-text-muted" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <span className="mx-1 text-text-muted">/</span>}
          <a href={item.href} className="hover:text-primary focus-visible-outline">
            {item.label}
          </a>
        </React.Fragment>
      ))}
    </nav>
  );
}
