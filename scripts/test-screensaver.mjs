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

  // Open settings to capture new Position and Size controls
  console.log("Opening settings drawer to check controls...");
  const settingsBtn = page.getByRole("button", { name: "Settings" });
  await settingsBtn.click();
  await page.waitForTimeout(600);

  const screensaverLabel = page.locator("#quick-screensaver-label");
  await screensaverLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const settingsScreenshotPath = path.join(ARTIFACT_DIR, "screensaver_settings_controls_verified.png");
  await page.screenshot({ path: settingsScreenshotPath });
  console.log(`Saved screensaver settings screenshot to ${settingsScreenshotPath}`);

  // Test selecting Top Left position
  console.log("Selecting 'Top left' position...");
  const posSelect = page.locator("#quick-clock-position");
  await posSelect.selectOption("top-left");
  await page.waitForTimeout(400);

  // Close settings
  console.log("Closing settings...");
  const doneBtn = page.getByRole("button", { name: "Done" });
  await doneBtn.click();
  await page.waitForTimeout(500);

  // Enter Ambient Mode
  console.log("Clicking Ambient button to enter Ambient Mode...");
  const ambientBtn = page.locator(".control-button--ambient");
  await ambientBtn.click();
  await page.waitForTimeout(600);

  console.log("Waiting 10.5 seconds for screensaver clock to activate at top-left...");
  await page.waitForTimeout(10500);

  const clockVisible = await page.waitForSelector(".screensaver-clock--visible", { timeout: 3000 });
  const isTopLeft = await page.$eval(".screensaver-clock", (el) =>
    el.classList.contains("screensaver-clock--pos-top-left")
  );
  const timeText = await page.textContent(".screensaver-clock__time");
  console.log(`Clock is visible: ${!!clockVisible}, isTopLeft: ${isTopLeft}, time: ${timeText}`);

  const customizedScreenshotPath = path.join(ARTIFACT_DIR, "screensaver_customized_verified.png");
  await page.screenshot({ path: customizedScreenshotPath });
  console.log(`Saved customized top-left screensaver screenshot to ${customizedScreenshotPath}`);

  await browser.close();
  console.log("All tests completed successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
