import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Render migration contract", () => {
  it("runs the idempotent schema in a transaction and fails on errors", async () => {
    const script = await readFile("scripts/migrate.mjs", "utf8");
    expect(script).toContain('await pool.query("BEGIN")');
    expect(script).toContain('await pool.query("COMMIT")');
    expect(script).toContain('await pool.query("ROLLBACK")');
    expect(script).toContain("process.exitCode = 1");
    expect(script).not.toContain("Migration warning:");
  });

  it("keeps schema changes idempotent", async () => {
    const schema = await readFile("src/db/schema.sql", "utf8");
    expect(schema).not.toMatch(/CREATE TABLE\s+(?!IF NOT EXISTS)/i);
    expect(schema).not.toMatch(/CREATE INDEX\s+(?!IF NOT EXISTS)/i);
    expect(schema).not.toMatch(/ALTER TABLE .* ADD COLUMN\s+(?!IF NOT EXISTS)/i);
  });
});
