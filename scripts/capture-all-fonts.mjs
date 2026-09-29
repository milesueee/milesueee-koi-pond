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
      console.log(`Saved: ${targetPath}`);
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
  
  // Wait for all fonts (including Silkscreen, DotGothic16, VT323) to load
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);

  // Enter Ambient Mode
  console.log("Clicking Ambient button to enter Ambient Mode...");
  const ambientBtn = page.locator(".control-button--ambient");
  await ambientBtn.click();
  await page.evaluate(() => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  });

  console.log("Waiting 11 seconds for controls to hide and screensaver clock to activate...");
  await page.waitForTimeout(11000);
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 4000 });

  // 1. Capture Silkscreen (Cozy Pixel HUD)
  console.log("Capturing 1. Silkscreen (Handheld / Game Boy UI)...");
  await page.evaluate(() => {
    window.nagomiSettings.setWeather("sunny");
    window.nagomiSettings.set(["screensaver", "style"], "pixel-hud");
    window.nagomiSettings.set(["screensaver", "font"], "silkscreen");
    window.nagomiSettings.set(["screensaver", "position"], "bottom-right");
  });
  await page.waitForTimeout(700);
  await safeSaveScreenshot(page, "screensaver_font_silkscreen.png");

  // 2. Capture DotGothic16 (16-bit Japanese Retro RPG)
  console.log("Capturing 2. DotGothic16 (16-bit Japanese Retro RPG)...");
  await page.evaluate(() => {
    window.nagomiSettings.set(["screensaver", "font"], "dotgothic");
  });
  await page.waitForTimeout(700);
  await safeSaveScreenshot(page, "screensaver_font_dotgothic.png");

  // 3. Capture VT323 (Retro Terminal)
  console.log("Capturing 3. VT323 (Retro Terminal)...");
  await page.evaluate(() => {
    window.nagomiSettings.set(["screensaver", "font"], "vt323");
  });
  await page.waitForTimeout(700);
  await safeSaveScreenshot(page, "screensaver_font_vt323.png");

  // 4. Capture Silkscreen in Sunset Atmosphere
  console.log("Capturing 4. Silkscreen in Sunset Atmosphere...");
  await page.evaluate(() => {
    window.nagomiSettings.setWeather("sunset");
    window.nagomiSettings.set(["screensaver", "font"], "silkscreen");
  });
  await page.waitForTimeout(700);
  await safeSaveScreenshot(page, "screensaver_font_silkscreen_sunset.png");

  // 5. Capture DotGothic16 in Moonlight Atmosphere
  console.log("Capturing 5. DotGothic16 in Moonlight Atmosphere...");
  await page.evaluate(() => {
    window.nagomiSettings.setWeather("moonlight");
    window.nagomiSettings.set(["screensaver", "font"], "dotgothic");
  });
  await page.waitForTimeout(700);
  await safeSaveScreenshot(page, "screensaver_font_dotgothic_moonlight.png");

  await browser.close();
  console.log("All pixel font comparison screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
