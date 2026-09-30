import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector(".control-dock");
  await page.waitForTimeout(500);

  // Take screenshot with toolbar visible showing Clock toggle
  const screenshotDesktop = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "toolbar_clock_toggle_desktop.png"), screenshotDesktop);
  console.log("Saved toolbar_clock_toggle_desktop.png");

  // Verify clock toggle state
  const isClockTogglePresent = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll(".control-dock .control-label")).map(el => el.textContent?.trim());
    return labels.includes("Clock");
  });
  console.log("Clock label in dock:", isClockTogglePresent);

  // Test mobile portrait view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const screenshotMobile = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "toolbar_clock_toggle_mobile.png"), screenshotMobile);
  console.log("Saved toolbar_clock_toggle_mobile.png");

  await browser.close();
}

main().catch(console.error);
