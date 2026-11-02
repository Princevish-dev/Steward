import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/db/client", () => ({ getDatabasePool: () => ({ query }) }));

import { ensureDatabaseMigrated, getSchemaPath } from "./migrate";

describe("database schema path", () => {
  it("resolves the schema from the project root for the Next.js runtime", () => {
    const schemaPath = getSchemaPath();

    expect(schemaPath).toBe(resolve(process.cwd(), "src", "db", "schema.sql"));
    expect(existsSync(schemaPath)).toBe(true);
  });

  it("shares one migration across concurrent callers", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://test.invalid/steward";
    query.mockReset().mockResolvedValue({});

    try {
      await Promise.all(Array.from({ length: 5 }, () => ensureDatabaseMigrated()));
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });
});
