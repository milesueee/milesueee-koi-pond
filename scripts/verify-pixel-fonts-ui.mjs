import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function safeSaveScreenshot(page, filename) {
  const targetPath = path.join(ARTIFACT_DIR, filename);
  const buffer = await page.screenshot({ type: "png" });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(targetPath, buffer);
      console.log(`Saved screenshot: ${targetPath}`);
      return;
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5174...");
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector("#pond");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  // 1. Open Settings drawer
  console.log("Opening Settings Drawer...");
  const settingsBtn = page.locator("button[aria-label='Open pond settings']");
  await settingsBtn.click();
  await page.waitForTimeout(600);

  // Scroll to screensaver section in quick settings
  const screensaverLabel = page.locator("label[for='quick-screensaver']");
  await screensaverLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Check dropdown options
  const fontSelect = page.locator("#quick-clock-font");
  const options = await fontSelect.evaluate((sel) => {
    return Array.from(sel.querySelectorAll("option")).map((o) => ({
      value: o.value,
      label: o.textContent.trim(),
      optgroup: o.parentElement?.tagName === "OPTGROUP" ? o.parentElement.getAttribute("label") : null,
    }));
  });
  console.log("Font Select Options:", JSON.stringify(options, null, 2));

  // Save screenshot of Settings drawer showing screensaver controls
  await safeSaveScreenshot(page, "screensaver_settings_drawer_fonts.png");

  // 2. Select Silkscreen via the UI dropdown
  console.log("Selecting 'silkscreen' from UI dropdown...");
  await fontSelect.selectOption("silkscreen");
  await page.waitForTimeout(300);

  // Close settings drawer by pressing Escape or clicking backdrop
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 3. Hide UI to show clock (testing displayWhenUiHidden)
  console.log("Pressing 'h' to hide UI and reveal clock...");
  await page.keyboard.press("h");
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 4000 });
  await page.waitForTimeout(600);

  const clockFontClassSilkscreen = await page.locator(".screensaver-clock").getAttribute("class");
  console.log("Clock classes with Silkscreen:", clockFontClassSilkscreen);
  await safeSaveScreenshot(page, "screensaver_clock_silkscreen_verified.png");

  // 4. Test DotGothic16
  console.log("Testing DotGothic16 via UI dropdown...");
  // Press 'h' to show UI again
  await page.keyboard.press("h");
  await page.waitForTimeout(500);

  // Re-open settings
  await settingsBtn.click();
  await page.waitForTimeout(500);
  await screensaverLabel.scrollIntoViewIfNeeded();
  await fontSelect.selectOption("dotgothic");
  await page.waitForTimeout(300);

  // Close settings and hide UI
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("h");
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 4000 });
  await page.waitForTimeout(600);

  const clockFontClassDotgothic = await page.locator(".screensaver-clock").getAttribute("class");
  console.log("Clock classes with DotGothic16:", clockFontClassDotgothic);
  await safeSaveScreenshot(page, "screensaver_clock_dotgothic_verified.png");

  // 5. Test VT323
  console.log("Testing VT323 via UI dropdown...");
  await page.keyboard.press("h");
  await page.waitForTimeout(500);

  await settingsBtn.click();
  await page.waitForTimeout(500);
  await screensaverLabel.scrollIntoViewIfNeeded();
  await fontSelect.selectOption("vt323");
  await page.waitForTimeout(300);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("h");
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 4000 });
  await page.waitForTimeout(600);

  const clockFontClassVt323 = await page.locator(".screensaver-clock").getAttribute("class");
  console.log("Clock classes with VT323:", clockFontClassVt323);
  await safeSaveScreenshot(page, "screensaver_clock_vt323_verified.png");

  await browser.close();
  console.log("Verification finished successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
