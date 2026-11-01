import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on("pageerror", err => {
    console.error("PAGE ERROR:", err.message, err.stack);
    errors.push(err.message);
  });
  page.on("console", msg => {
    if (msg.type() === "error") {
      console.error("CONSOLE ERROR:", msg.text());
      errors.push(msg.text());
    }
  });

  const urls = [
    "https://steward-w7pk.onrender.com/",
    "https://steward-w7pk.onrender.com/dashboard",
    "https://steward-w7pk.onrender.com/new",
    "https://steward-w7pk.onrender.com/approvals",
    "https://steward-w7pk.onrender.com/mandates",
    "https://steward-w7pk.onrender.com/orders",
    "https://steward-w7pk.onrender.com/ledger"
  ];

  for (const url of urls) {
    console.log(`\nNavigating to ${url}...`);
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      console.log(`Status: ${resp?.status()}`);
      await page.waitForTimeout(1000);
    } catch (e) {
      console.error(`Failed to load ${url}:`, e.message);
    }
  }

  await browser.close();
  console.log("\nTotal errors collected:", errors.length);
  if (errors.length > 0) {
    console.log("Errors:", errors);
  }
}

main().catch(console.error);

