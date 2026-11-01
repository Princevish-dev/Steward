"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export type LedgerGridRow = {
  sequence: number;
  timestamp: string;
  type: string;
  runId: string;
  entryHash: string;
  decision?: string;
  rationale?: string;
  ruleResults?: Array<{ id: string; passed: boolean; reason: string }>;
};

function DecisionBadge({ value }: ICellRendererParams<LedgerGridRow, string>) {
  const color = value === "BLOCK" ? "#ff7b8b" : value === "ASK_HUMAN" ? "#f0c674" : "#6ee7b7";
  return <span style={{ color, fontWeight: 700 }}>{value ?? "—"}</span>;
}

export default function LedgerGrid({
  rows,
  valid,
  onVerify
}: {
  rows: LedgerGridRow[];
  valid: boolean | null;
  onVerify: () => void;
}) {
  const [quickFilter, setQuickFilter] = useState("");
  const [selected, setSelected] = useState<LedgerGridRow | null>(null);
  const columnDefs = useMemo<ColDef<LedgerGridRow>[]>(() => [
    { field: "runId", headerName: "Run group", sortable: true, flex: 1 },
    { field: "sequence", headerName: "Seq", sortable: true, width: 90 },
    { field: "timestamp", sortable: true, flex: 1 },
    { field: "type", sortable: true, flex: 1 },
    { field: "decision", headerName: "Decision", cellRenderer: DecisionBadge, sortable: true, width: 150 }
  ], []);

  return (
    <section aria-label="ledger grid" style={{ marginTop: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
        <h2>Ledger grid</h2>
        <div>
          <input aria-label="Quick filter ledger" value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)}
            placeholder="Quick filter" style={{ width: 150, padding: ".45rem" }} />
          <strong style={{ color: valid === false ? "#ff7b8b" : valid ? "#6ee7b7" : "#b8c0d9" }}>
            {valid === false ? "TAMPERED — INVALID" : valid ? "VALID — VERIFIED" : "NOT VERIFIED"}
          </strong>
          <button type="button" onClick={onVerify} style={{ marginLeft: ".75rem", padding: ".45rem .7rem" }}>Verify</button>
        </div>
      </div>
      <div className="ag-theme-quartz" style={{ height: 420, width: "100%" }}>
        <AgGridReact<LedgerGridRow>
          rowData={rows}
          columnDefs={columnDefs}
          theme={themeQuartz}
          quickFilterText={quickFilter}
          defaultColDef={{ resizable: true }}
          getRowId={(params) => String(params.data.sequence)}
          onRowClicked={(event) => setSelected(event.data ?? null)}
          animateRows
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100]}
        />
      </div>
      {selected && (
        <aside aria-label="ledger detail panel" style={{ marginTop: ".75rem", padding: "1rem", border: "1px solid #293252", borderRadius: 8 }}>
          <strong>Run detail: {selected.runId}</strong>
          <p>{selected.rationale ?? "Ledger transition recorded."}</p>
          {(selected.ruleResults ?? []).map((rule) => (
            <div key={rule.id}><b>{rule.id}</b> {rule.passed ? "PASS" : "FAIL"} — {rule.reason}</div>
          ))}
        </aside>
      )}
    </section>
  );
}
