import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

try {
  const schema = await readFile(new URL("../src/db/schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  console.log("Database schema is ready.");
} finally {
  await pool.end();
}
