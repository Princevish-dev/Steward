import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
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
  await pool.query(schema);
  console.log("Database schema is ready.");
} catch (error) {
  console.error("Migration warning:", error instanceof Error ? error.message : error);
} finally {
  await pool.end();
}
