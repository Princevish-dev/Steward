import { getDatabasePool } from "../src/db/client";
import { ensureDatabaseMigrated } from "../src/db/migrate";
import { recordLedgerEvent } from "../src/core/ledger/store";
import type { Mandate } from "../src/core/mandate/schema";

async function cleanDatabase() {
  console.log("Connecting to Neon database...");
  await ensureDatabaseMigrated();
  const pool = getDatabasePool();

  console.log("Truncating all operational tables...");
  await pool.query(`
    TRUNCATE TABLE 
      refunds, 
      disputes, 
      approvals, 
      payment_orders, 
      runs, 
      mandate_api_keys, 
      mandates, 
      ledger_entries, 
      paypal_webhook_events 
    CASCADE;
  `);

  try {
    await pool.query(`ALTER SEQUENCE ledger_entries_sequence_seq RESTART WITH 1;`);
  } catch (err) {
    console.log("Sequence restart notice:", err);
  }

  console.log("Creating fresh active mandate: 'Buy office stationery for my team' for pv405@outlook.com...");
  const owner = "pv405@outlook.com";
  const mandateId = `mdt_${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const cleanMandate: Mandate = {
    id: mandateId,
    owner,
    purpose: "Buy office stationery for my team",
    status: "ACTIVE",
    currency: "USD",
    period: {
      type: "monthly",
      budget: 220
    },
    caps: {
      perItem: 60,
      perTransaction: 150,
      maxQuantityPerItem: 5
    },
    askAbove: 80,
    categories: ["office_supplies"],
    merchants: {
      allow: [],
      deny: ["blocked.example"]
    },
    velocity: {
      maxAutoPurchasesPer24h: 3
    },
    expiresAt
  };

  await pool.query(
    `INSERT INTO mandates (id, owner, user_id, purpose, definition, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, now(), now())`,
    [
      cleanMandate.id,
      cleanMandate.owner,
      cleanMandate.owner,
      cleanMandate.purpose,
      JSON.stringify(cleanMandate),
      cleanMandate.status
    ]
  );

  console.log("Anchoring mandate creation on the SHA-256 cryptographic ledger...");
  await recordLedgerEvent({
    type: "MANDATE_CREATED",
    runId: "system",
    mandateId: cleanMandate.id,
    payload: {
      mandate: cleanMandate
    },
    userId: cleanMandate.owner
  });

  await recordLedgerEvent({
    type: "MANDATE_CONFIRMED",
    runId: "system",
    mandateId: cleanMandate.id,
    payload: {
      status: "ACTIVE"
    },
    userId: cleanMandate.owner
  });

  console.log("✓ Neon database cleaned successfully!");
  console.log(`✓ Active Mandate ID: ${cleanMandate.id} ("${cleanMandate.purpose}")`);
  console.log(`✓ Budget: $220.00 | Cap: $60.00 | Ask Threshold: $80.00`);
  process.exit(0);
}

cleanDatabase().catch((err) => {
  console.error("Clean database error:", err);
  process.exit(1);
});
