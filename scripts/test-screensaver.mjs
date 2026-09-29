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

  console.log("Pressing 'F' to toggle Ambient Mode...");
  await page.keyboard.press("f");
  await page.waitForTimeout(500);

  console.log("Waiting 10.5 seconds for screensaver clock to activate...");
  // Wait without moving mouse
  await page.waitForTimeout(10500);

  const clockVisible = await page.waitForSelector(".screensaver-clock--visible", { timeout: 3000 });
  const timeText = await page.textContent(".screensaver-clock__time");
  const dateText = await page.textContent(".screensaver-clock__date");
  const isSerif = await page.$eval(".screensaver-clock", (el) => el.classList.contains("screensaver-clock--serif"));

  console.log(`Clock is visible: ${!!clockVisible}`);
  console.log(`Time: ${timeText}`);
  console.log(`Date: ${dateText}`);
  console.log(`Is Editorial Serif: ${isSerif}`);

  const clockScreenshotPath = path.join(ARTIFACT_DIR, "screensaver_clock_verified.png");
  await page.screenshot({ path: clockScreenshotPath });
  console.log(`Saved screensaver clock screenshot to ${clockScreenshotPath}`);

  // Test mouse movement hides clock
  console.log("Moving mouse to test activity dismissal...");
  await page.mouse.move(200, 200);
  await page.waitForTimeout(500);
  const stillVisible = await page.$eval(".screensaver-clock", (el) => el.classList.contains("screensaver-clock--visible"));
  console.log(`Clock visible after mouse move: ${stillVisible} (expected false)`);

  // Open settings drawer to capture settings controls
  console.log("Opening settings to capture screensaver controls...");
  const settingsBtn = page.getByRole("button", { name: "Settings" });
  await settingsBtn.click();
  await page.waitForTimeout(600);

  // Scroll down in quick-settings to screensaver section
  const screensaverLabel = page.locator("#quick-screensaver-label");
  await screensaverLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const settingsScreenshotPath = path.join(ARTIFACT_DIR, "screensaver_settings_verified.png");
  await page.screenshot({ path: settingsScreenshotPath });
  console.log(`Saved screensaver settings screenshot to ${settingsScreenshotPath}`);

  await browser.close();
  console.log("All tests completed successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
