import { test, expect } from "@playwright/test";

test("capture homepage screenshots", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Desktop screenshot
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/homepage-desktop.png", fullPage: true });

  // Mobile screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/homepage-mobile.png", fullPage: true });

  // Verify key elements visible at desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("heading", { name: /Give your AI agent a mandate, not your credit card./ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Launch Control Room/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create a Mandate/ })).toBeVisible();
});

test("capture dashboard screenshots", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
});
