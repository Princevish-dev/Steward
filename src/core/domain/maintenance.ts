import { recordLedgerEvent } from "@/core/ledger/store";
import { ensureDatabaseMigrated } from "@/db/migrate";
import { getDatabasePool } from "@/db/client";
import { getRunContext } from "@/core/domain/store";

export async function runMaintenance() {
  await ensureDatabaseMigrated();
  const expired = await getDatabasePool().query(
    `UPDATE approvals SET status = 'EXPIRED', resolved_at = now()
     WHERE status = 'PENDING' AND expires_at IS NOT NULL AND expires_at <= now()
     RETURNING id, run_id`
  );
  for (const approval of expired.rows as Array<{ id: string; run_id: string }>) {
    const context = await getRunContext(approval.run_id);
    await recordLedgerEvent({
      type: "APPROVAL_EXPIRED",
      runId: approval.run_id,
      mandateId: context?.mandate_id ?? "unknown",
      payload: { approvalId: approval.id, reason: "APPROVAL_TTL_EXPIRED" }
    });
  }
  return { expiredApprovals: expired.rowCount ?? expired.rows.length, voidedHolds: 0 };
}
