import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.log("DATABASE_URL is not configured; skipping migration step.");
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

try {
  const schema = await readFile(new URL("../src/db/schema.sql", import.meta.url), "utf8");
  await pool.query("BEGIN");
  await pool.query(schema);
  await pool.query("COMMIT");
  console.log("Database schema is ready.");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
