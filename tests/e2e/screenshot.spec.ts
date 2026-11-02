import { test, expect } from "@playwright/test";
import { demoLogin } from "./helpers";

const ALL_PAGES = [
  { name: "landing", path: "/" },
  { name: "dashboard", path: "/dashboard" },
  { name: "mandates", path: "/mandates" },
  { name: "mandate-wizard", path: "/new" },
  { name: "purchase-requests", path: "/purchase-requests" },
  { name: "approvals", path: "/approvals" },
  { name: "orders", path: "/orders" },
  { name: "payments", path: "/payments" },
  { name: "refunds", path: "/refunds" },
  { name: "tracking", path: "/tracking" },
  { name: "ledger", path: "/ledger" },
  { name: "redteam", path: "/redteam" },
  { name: "disputes", path: "/disputes" },
  { name: "mcp", path: "/mcp" },
  { name: "settings", path: "/settings" },
  { name: "api-docs", path: "/api-docs" },
];

test.describe("Full Visual QA & Screenshot Matrix", () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
  });

  for (const pageItem of ALL_PAGES) {
    test(`capture ${pageItem.name} page`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name === "mobile";
      const mode = isMobile ? "mobile" : "desktop";

      await page.goto(pageItem.path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(500);

      // Verify no horizontal overflow on mobile
      if (isMobile) {
        const bodyOverflow = await page.evaluate(() => {
          return {
            scrollWidth: document.body.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          };
        });
        expect(bodyOverflow.scrollWidth).toBeLessThanOrEqual(bodyOverflow.clientWidth + 2);
      }

      // Capture screenshot into test-results/screenshots/<mode>/
      await page.screenshot({
        path: `test-results/screenshots/${mode}/${pageItem.name}.png`,
        fullPage: true,
      });

      // Preserve legacy root screenshot paths
      if (pageItem.name === "landing") {
        await page.screenshot({
          path: `test-results/homepage-${mode}.png`,
          fullPage: true,
        });
      }
      if (pageItem.name === "dashboard") {
        await page.screenshot({
          path: `test-results/dashboard-${mode}.png`,
          fullPage: true,
        });
      }
    });
  }
});
