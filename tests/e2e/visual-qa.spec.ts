import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

test.describe("Tailwind v4 computed style verification", () => {
  test("landing page desktop — body styles and hero", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const bodyStyle = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.body);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        fontFamily: cs.fontFamily,
        overflowX: cs.overflowX,
      };
    });
    console.log("LANDING DESKTOP BODY:", JSON.stringify(bodyStyle));

    // Check for Tailwind utility classes on elements
    const navLink = page.locator("a[href='/dashboard']").first();
    if (await navLink.count() > 0) {
      const linkStyle = await navLink.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return { color: cs.color, textDecoration: cs.textDecoration };
      });
      console.log("NAV LINK STYLE:", JSON.stringify(linkStyle));
    }

    await page.screenshot({ path: "test-results/homepage-desktop.png", fullPage: true });
  });

  test("landing page mobile — body styles", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const bodyStyle = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.body);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        overflowX: cs.overflowX,
      };
    });
    console.log("LANDING MOBILE BODY:", JSON.stringify(bodyStyle));

    await page.screenshot({ path: "test-results/homepage-mobile.png", fullPage: true });
  });

  test("dashboard desktop — body styles", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const bodyStyle = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.body);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        overflowX: cs.overflowX,
      };
    });
    console.log("DASHBOARD DESKTOP BODY:", JSON.stringify(bodyStyle));

    await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });
  });

  test("dashboard mobile — body styles", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const bodyStyle = await page.evaluate(() => {
      const cs = window.getComputedStyle(document.body);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        overflowX: cs.overflowX,
      };
    });
    console.log("DASHBOARD MOBILE BODY:", JSON.stringify(bodyStyle));

    await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  });
});
