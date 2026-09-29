import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5174...");
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector("#pond");
  await page.waitForTimeout(1000);

  // Clear localStorage so we start with fresh defaults (Mac Minimalist, Center)
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#pond");
  await page.waitForTimeout(1000);

  // Enter Ambient Mode
  console.log("Clicking Ambient button to enter Ambient Mode...");
  const ambientBtn = page.locator(".control-button--ambient");
  await ambientBtn.click();
  await page.waitForTimeout(600);

  console.log("Waiting 10.5 seconds for Mac minimalist screensaver clock to activate...");
  await page.waitForTimeout(10500);

  const clockVisible = await page.waitForSelector(".screensaver-clock--visible", { timeout: 3000 });
  const isSans = await page.$eval(".screensaver-clock", (el) =>
    el.classList.contains("screensaver-clock--sans")
  );
  const timeText = await page.textContent(".screensaver-clock__time");
  const dateText = await page.textContent(".screensaver-clock__date");

  console.log(`Clock is visible: ${!!clockVisible}`);
  console.log(`Is Mac Minimalist (Sans): ${isSans}`);
  console.log(`Date (Top): ${dateText}`);
  console.log(`Time (Bottom): ${timeText}`);

  const macScreenshotPath = path.join(ARTIFACT_DIR, "screensaver_mac_minimalist_verified.png");
  await page.screenshot({ path: macScreenshotPath });
  console.log(`Saved Mac minimalist screensaver screenshot to ${macScreenshotPath}`);

  await browser.close();
  console.log("All tests completed successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
