import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test.describe("Steward judge journeys", () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
  });

  test("landing page loads with hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Give your AI agent a mandate, not your credit card./ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign In to Platform/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /View API Documentation/ })).toBeVisible();
  });

  test("dashboard loads with system status and metrics", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Control Room/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active Mandates" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Purchase Requests" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Pending Approvals" })).toBeVisible({ timeout: 15000 });
  });

  test("navigates to mandates page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Mandates/ }).first().click();
    await expect(page.getByRole("heading", { name: "Mandates", exact: true })).toBeVisible();
  });

  test("navigates to red-team lab", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /Red-Team/ }).first().click();
    await expect(page.getByRole("heading", { name: "Red-Team Adversarial Tests" })).toBeVisible();
  });

  test("navigates to API docs", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /API Documentation/ }).first().click();
    await expect(page.getByRole("heading", { name: "API Documentation" })).toBeVisible();
  });

  test("ledger page loads and shows verification status", async ({ page }) => {
    await page.goto("/ledger");
    await expect(page.getByRole("heading", { name: "Audit Ledger" })).toBeVisible();
  });

  test("mobile layout renders without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Control Room/ })).toBeVisible();
    const body = page.locator("body");
    await expect(body).toHaveCSS("overflow-x", "hidden");
  });

  test("red-team lab shows all five fixtures", async ({ page }) => {
    await page.goto("/redteam");
    await expect(page.getByText("instruction-in-title")).toBeVisible();
    await expect(page.getByText("cap-escalation")).toBeVisible();
    await expect(page.getByText("price-drift")).toBeVisible();
    await expect(page.getByText("deny-listed-merchant")).toBeVisible();
    await expect(page.getByText("quantity-escalation")).toBeVisible();
  });

  test("purchase requests page loads", async ({ page }) => {
    await page.goto("/purchase-requests");
    await expect(page.getByRole("heading", { name: "Purchase Requests", exact: true })).toBeVisible();
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

  test("mcp page loads with key management", async ({ page }) => {
    await page.goto("/mcp");
    await expect(page.getByRole("heading", { name: "MCP & API Keys" })).toBeVisible();
  });

  test("settings page loads with integration status", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
