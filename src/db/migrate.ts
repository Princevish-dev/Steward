import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDatabasePool } from "@/db/client";

let migrated = false;
let migrationPromise: Promise<void> | null = null;

export function getSchemaPath(projectRoot = process.cwd()): string {
  return resolve(projectRoot, "src", "db", "schema.sql");
}

export async function migrateDatabase(): Promise<void> {
  const schema = await readFile(getSchemaPath(), "utf8");
  await getDatabasePool().query(schema);
  migrated = true;
}

export async function ensureDatabaseMigrated(): Promise<void> {
  if (migrated) return;
  if (!process.env.DATABASE_URL) return;

  if (!migrationPromise) {
    migrationPromise = migrateDatabase().catch((error) => {
      console.error("Database auto-migration warning:", error instanceof Error ? error.message : error);
      migrationPromise = null;
    });
  }

  await migrationPromise;
}
