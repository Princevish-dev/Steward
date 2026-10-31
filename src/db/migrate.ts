import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDatabasePool } from "@/db/client";

export async function migrateDatabase(): Promise<void> {
  const schemaPath = fileURLToPath(new URL("./schema.sql", import.meta.url));
  const schema = await readFile(schemaPath, "utf8");
  await getDatabasePool().query(schema);
}
