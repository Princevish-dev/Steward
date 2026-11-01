"use client";

import Link from "next/link";
import * as React from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-xs text-text-muted" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                {i > 0 && <span className="mx-1">/</span>}
                <Link href={crumb.href} className="hover:text-primary focus-visible-outline">
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-text-primary mb-1">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
