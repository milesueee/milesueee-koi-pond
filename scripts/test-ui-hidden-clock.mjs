import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5174 (windowed mode)...");
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector("#pond");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  // Verify clock is NOT visible initially
  const initialClockVisible = await page.locator(".screensaver-clock--visible").count();
  console.log(`Initial clock visible count (should be 0): ${initialClockVisible}`);

  // Click "Hide UI" button in normal windowed mode
  console.log("Clicking 'Hide UI' button in normal windowed mode...");
  const hideUiBtn = page.locator('button[aria-label="Hide interface"]');
  await hideUiBtn.click();

  // Wait for clock to fade in
  console.log("Waiting for screensaver clock to become visible...");
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 3000 });
  await page.waitForTimeout(600);

  const screenshotPath = path.join(ARTIFACT_DIR, "screensaver_windowed_ui_hidden.png");
  const buffer = await page.screenshot();
  fs.writeFileSync(screenshotPath, buffer);
  console.log(`Saved screenshot: ${screenshotPath}`);

  // Test toggling displayWhenUiHidden to false
  console.log("Testing toggling displayWhenUiHidden off...");
  await page.evaluate(() => {
    window.nagomiSettings.set(["screensaver", "displayWhenUiHidden"], false);
  });
  await page.waitForTimeout(800);
  const hiddenWhenDisabled = await page.locator(".screensaver-clock--visible").count();
  console.log(`Clock visible count when setting disabled (should be 0): ${hiddenWhenDisabled}`);

  // Test toggling displayWhenUiHidden back to true
  console.log("Testing toggling displayWhenUiHidden back on...");
  await page.evaluate(() => {
    window.nagomiSettings.set(["screensaver", "displayWhenUiHidden"], true);
  });
  await page.waitForTimeout(800);
  const visibleWhenEnabled = await page.locator(".screensaver-clock--visible").count();
  console.log(`Clock visible count when setting re-enabled (should be 1): ${visibleWhenEnabled}`);

  await browser.close();
  console.log("All tests for displayWhenUiHidden passed successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
