import { expect, test } from "@playwright/test";

test.describe("Key pages verification", () => {
  test("landing page renders with hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Give your AI agent a mandate, not your credit card./ })).toBeVisible();
  });

  test("orders page loads", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("payments page loads", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
  });

  test("refunds page loads", async ({ page }) => {
    await page.goto("/refunds");
    await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();
  });

  test("tracking page loads", async ({ page }) => {
    await page.goto("/tracking");
    await expect(page.getByRole("heading", { name: "Tracking" })).toBeVisible();
  });

  test("disputes page loads", async ({ page }) => {
    await page.goto("/disputes");
    await expect(page.getByRole("heading", { name: "Disputes" })).toBeVisible();
  });

  test("mcp page loads", async ({ page }) => {
    await page.goto("/mcp");
    await expect(page.getByRole("heading", { name: "MCP & API Keys" })).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
