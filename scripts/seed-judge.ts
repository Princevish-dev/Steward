import fs from "node:fs";
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

import { getDatabasePool } from "../src/db/client";
import { ensureDatabaseMigrated } from "../src/db/migrate";
import { recordLedgerEvent } from "../src/core/ledger/store";
import type { Mandate } from "../src/core/mandate/schema";

async function seedJudgeMandate() {
  console.log("Connecting to database to seed judge account...");
  await ensureDatabaseMigrated();
  const pool = getDatabasePool();

  const owner = "judge@paypal.com";
  const existing = await pool.query("SELECT id FROM mandates WHERE owner = $1 LIMIT 1", [owner]);
  if (existing.rows.length > 0) {
    console.log(`Judge mandate already exists for ${owner}: ${existing.rows[0].id}`);
    process.exit(0);
  }

  const mandateId = `mdt_${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const judgeMandate: Mandate = {
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
      judgeMandate.id,
      judgeMandate.owner,
      judgeMandate.owner,
      judgeMandate.purpose,
      JSON.stringify(judgeMandate),
      judgeMandate.status
    ]
  );

  await recordLedgerEvent({
    type: "MANDATE_CREATED",
    runId: "system",
    mandateId: judgeMandate.id,
    payload: { mandate: judgeMandate },
    userId: judgeMandate.owner
  });

  await recordLedgerEvent({
    type: "MANDATE_CONFIRMED",
    runId: "system",
    mandateId: judgeMandate.id,
    payload: { status: "ACTIVE" },
    userId: judgeMandate.owner
  });

  console.log(`✓ Seeded benchmark active mandate for ${owner}: ${judgeMandate.id}`);
  process.exit(0);
}

seedJudgeMandate().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
