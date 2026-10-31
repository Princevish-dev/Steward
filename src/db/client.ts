import { Pool } from "pg";

let pool: Pool | undefined;

export function getDatabasePool(env: NodeJS.ProcessEnv = process.env): Pool {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  pool ??= new Pool({
    connectionString,
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
