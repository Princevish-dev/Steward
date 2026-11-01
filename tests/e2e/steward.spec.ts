import { expect, test } from "@playwright/test";

test.describe("Steward judge journeys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Demo login/ }).click();
    await expect(page.getByText(/Demo login ready/)).toBeVisible({ timeout: 15_000 });
  });

  test("runs AUTO, ASK approval, deny, BLOCK and hostile scenarios", async ({ page }) => {
    const scenarios = [
      ["within", /AUTO APPROVE/],
      ["ask", /ASK HUMAN/],
      ["over-cap", /BLOCK/],
      ["hostile", /BLOCK/]
    ] as const;
    for (const [value, outcome] of scenarios) {
      await page.getByLabel("Scenario").selectOption(value);
      await page.getByRole("button", { name: "Run Steward" }).click();
      await expect(page.getByRole("heading", { name: outcome })).toBeVisible();
    }
  });

  test("approval inbox supports approve and deny", async ({ page }) => {
    await page.getByLabel("Scenario").selectOption("ask");
    await page.getByRole("button", { name: "Run Steward" }).click();
    await expect(page.getByText("ASK HUMAN")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Reject" }).first().click();
  });

  test("ledger verifies and shows mobile layout without forced clicks", async ({ page }) => {
    await page.getByLabel("Scenario").selectOption("within");
    await page.getByRole("button", { name: "Run Steward" }).click();
    await expect(page.getByRole("heading", { name: /AUTO APPROVE/ })).toBeVisible();
    await page.getByRole("button", { name: /Verify/ }).click();
    await expect(page.getByText(/VALID — VERIFIED|TAMPERED — INVALID/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Run Steward" })).toBeVisible();
  });

  test("mandate lifecycle can be revoked", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Demo login/ }).click();
    await page.goto("/new");
    await page.getByLabel("Owner email").fill("judge@example.com");
    await page.getByLabel("Purchasing instructions").fill("Buy paper; max $120 a month; nothing over $40 per item; ask me above $60.");
    await page.getByRole("button", { name: /Parse mandate/ }).click();
    await expect(page.getByRole("button", { name: /Confirm/ })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Confirm/ }).click();
    await expect(page.getByRole("button", { name: /Revoke/ })).toBeVisible();
    await page.getByRole("button", { name: /Revoke/ }).click();
  });
});
