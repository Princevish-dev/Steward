import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDatabasePool } from "@/db/client";

let migrated = false;

export async function migrateDatabase(): Promise<void> {
  const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
  const schema = await readFile(schemaPath, "utf8");
  await getDatabasePool().query(schema);
  migrated = true;
}

export async function ensureDatabaseMigrated(): Promise<void> {
  if (migrated) return;
  if (!process.env.DATABASE_URL) return;
  try {
    await migrateDatabase();
  } catch (error) {
    console.error("Database auto-migration warning:", error instanceof Error ? error.message : error);
  }
}
