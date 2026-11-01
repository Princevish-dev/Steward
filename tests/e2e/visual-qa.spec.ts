import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

test.describe("Visual QA screenshots", () => {
  test("landing page desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const bodyStyle = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.body);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontFamily: cs.fontFamily,
      };
    });

    // Dark fintech background (#0b1020) and sans-serif font
    expect(bodyStyle.backgroundColor).toBe("rgb(11, 16, 32)");
    expect(bodyStyle.fontFamily.toLowerCase()).toContain("sans-serif");

    await page.screenshot({ path: "test-results/homepage-desktop.png", fullPage: true });
  });

  test("landing page mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/homepage-mobile.png", fullPage: true });
  });

  test("dashboard desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });
  });

  test("dashboard mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  });
});
