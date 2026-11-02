import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test.describe("Key pages verification", () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
  });

  test("landing page renders with hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Give your AI agent a mandate, not your credit card./ })).toBeVisible();
  });

  test("orders page loads", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  });

  test("payments page loads", async ({ page }) => {
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: "Payments", exact: true })).toBeVisible();
  });

  test("refunds page loads", async ({ page }) => {
    await page.goto("/refunds");
    await expect(page.getByRole("heading", { name: "Refunds", exact: true })).toBeVisible();
  });

  test("tracking page loads", async ({ page }) => {
    await page.goto("/tracking");
    await expect(page.getByRole("heading", { name: "Tracking", exact: true })).toBeVisible();
  });

  test("disputes page loads", async ({ page }) => {
    await page.goto("/disputes");
    await expect(page.getByRole("heading", { name: "Disputes", exact: true })).toBeVisible();
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
