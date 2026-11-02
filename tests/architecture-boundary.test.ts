import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve("src");
const restrictedRoots = [
  path.join(root, "core", "ai"),
  path.join(root, "core", "agents"),
  path.join(root, "core", "mandate"),
  path.join(root, "core", "ask"),
  path.join(root, "app", "api", "ask")
];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [entryPath] : [];
  }));
  return nested.flat();
}

describe("AI and mandate import boundary", () => {
  it("keeps AI, agents, and mandate parsing away from PayPal, payment, and domain store modules", async () => {
    const files = (await Promise.all(restrictedRoots.filter(existsSync).map(sourceFiles))).flat();
    const violations: string[] = [];
    const restrictedImport = /(?:from\s*["']|import\s*(?:\(\s*)?["']|require\s*\(\s*["'])([^"']+)["']/g;

    for (const file of files) {
      const contents = await readFile(file, "utf8");
      for (const match of contents.matchAll(restrictedImport)) {
        const specifier = match[1].replace(/\\/g, "/");
        const resolved = (specifier.startsWith("@/")
          ? path.resolve(process.cwd(), "src", specifier.slice(2))
          : path.resolve(path.dirname(file), specifier)).replace(/\\/g, "/").toLowerCase();
        if (resolved.includes("/src/core/paypal/") || resolved.endsWith("/src/core/paypal") ||
            resolved.includes("/src/core/payment/") || resolved.endsWith("/src/core/payment") ||
            resolved.endsWith("/src/core/domain/store") || resolved.includes("/src/core/domain/store/")) {
          violations.push(`${path.relative(process.cwd(), file)} imports ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
