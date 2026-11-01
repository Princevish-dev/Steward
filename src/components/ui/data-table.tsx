"use client";

import * as React from "react";

type DataTableProps<T> = {
  columns: Array<{ key: string; header: string; width?: string }>;
  data: T[];
  renderCell: (item: T, key: string) => React.ReactNode;
  emptyMessage?: string;
  rowKey?: (item: T, index: number) => string;
};

export function DataTable<T>({
  columns,
  data,
  renderCell,
  emptyMessage = "No records found.",
  rowKey = (_, index) => String(index)
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-4">
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-xs font-semibold text-text-muted uppercase border-b border-border bg-surface"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item, index) => (
            <tr key={rowKey(item, index)} className="hover:bg-surface focus-visible-outline">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-text-primary">
                  {renderCell(item, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
