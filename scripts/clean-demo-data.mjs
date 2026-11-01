import pg from "pg";

const apply = process.argv.includes("--apply");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const candidates = await client.query(`
    SELECT id, owner, status, created_at
    FROM mandates
    WHERE id LIKE 'demo-%'
       OR owner IN ('judge@example.com', 'demo@example.com')
    ORDER BY created_at
  `);
  const orphanLedger = await client.query(`
    SELECT mandate_id, count(*)::int AS rows
    FROM ledger_entries l
    LEFT JOIN mandates m ON m.id = l.mandate_id
    WHERE m.id IS NULL
      AND (l.mandate_id = 'demo-mandate' OR l.mandate_id LIKE 'ledger-test-%')
    GROUP BY mandate_id
    ORDER BY mandate_id
  `);
  console.log(`Demo/test mandates matched: ${candidates.rowCount}`);
  for (const row of candidates.rows) {
    console.log(`${row.id} owner=${row.owner} status=${row.status} created=${row.created_at.toISOString()}`);
  }
  console.log(`Orphan demo/test ledger chains matched: ${orphanLedger.rowCount}`);
  for (const row of orphanLedger.rows) console.log(`${row.mandate_id} ledgerRows=${row.rows}`);
  if (!apply) {
    await client.query("ROLLBACK");
    console.log("Dry run only. Re-run with --apply to delete exactly these mandates and dependent rows.");
  } else {
    const ids = candidates.rows.map((row) => row.id);
    const orphanIds = orphanLedger.rows.map((row) => row.mandate_id);
    if (ids.length > 0 || orphanIds.length > 0) {
      const counts = {};
      for (const [name, sql] of Object.entries({
        refunds: "DELETE FROM refunds WHERE order_id IN (SELECT id FROM payment_orders WHERE run_id IN (SELECT id FROM runs WHERE mandate_id = ANY($1)))",
        disputes: "DELETE FROM disputes WHERE order_id IN (SELECT id FROM payment_orders WHERE run_id IN (SELECT id FROM runs WHERE mandate_id = ANY($1)))",
        payment_orders: "DELETE FROM payment_orders WHERE run_id IN (SELECT id FROM runs WHERE mandate_id = ANY($1))",
        approvals: "DELETE FROM approvals WHERE run_id IN (SELECT id FROM runs WHERE mandate_id = ANY($1))",
        mandate_api_keys: "DELETE FROM mandate_api_keys WHERE mandate_id = ANY($1)",
        ledger_entries: "DELETE FROM ledger_entries WHERE mandate_id = ANY($1) OR mandate_id = ANY($2)",
        runs: "DELETE FROM runs WHERE mandate_id = ANY($1)",
        mandates: "DELETE FROM mandates WHERE id = ANY($1)"
      })) {
        const result = await client.query(name === "ledger_entries" ? sql : sql, name === "ledger_entries" ? [ids, orphanIds] : [ids]);
        counts[name] = result.rowCount;
      }
      await client.query("COMMIT");
      console.log(JSON.stringify({ deleted: counts }));
    } else {
      await client.query("COMMIT");
      console.log("Nothing to delete.");
    }
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
