import { expect, type BrowserContext, type Page } from "@playwright/test";

let cachedDemoCookie: Awaited<ReturnType<BrowserContext["cookies"]>>[number] | undefined;

export async function demoLogin(page: Page) {
  if (cachedDemoCookie) {
    await page.context().addCookies([cachedDemoCookie]);
    await page.goto("/dashboard");
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email Address").fill("judge@example.com");
  await page.getByRole("button", { name: /Sign In/ }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });

  cachedDemoCookie = (await page.context().cookies()).find((cookie) => cookie.name === "steward_session");
  expect(cachedDemoCookie, "demo login should set a session cookie").toBeDefined();
}
