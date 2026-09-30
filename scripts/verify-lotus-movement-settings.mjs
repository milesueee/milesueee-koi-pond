import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector("#pond");

  // Open settings drawer
  await page.click(".settings-trigger");
  await page.waitForSelector(".settings-drawer", { state: "visible" });
  await page.waitForTimeout(500);

  // Scroll to "Plants & life" section in settings
  await page.evaluate(() => {
    const heading = document.querySelector("#quick-plants-heading");
    if (heading) heading.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);

  const screenshot = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "lotus_movement_settings.png"), screenshot);
  console.log("Saved lotus_movement_settings.png");

  // Verify slider presence
  const sliders = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll(".quick-setting__label")).map(el => el.textContent?.trim());
    return labels.filter(l => l && l.includes("Lotus"));
  });
  console.log("Lotus sliders found in UI:", sliders);

  await browser.close();
}

main().catch(console.error);
