import { chromium, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Emulate iPhone in landscape
  const iPhone = devices["iPhone 14"];
  const context = await browser.newContext({
    ...iPhone,
    viewport: { width: 844, height: 390 }, // Landscape
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto("http://localhost:5174", { waitUntil: "networkidle" });
  await page.waitForSelector("#pond");
  await page.waitForTimeout(1000);

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector(".stage")?.getBoundingClientRect();
    const shell = document.querySelector(".pond-shell")?.getBoundingClientRect();
    const display = document.querySelector(".display")?.getBoundingClientRect();
    const pond = document.querySelector("#pond")?.getBoundingClientRect();
    const canvas = document.querySelector("#pond");
    return {
      window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
      stage,
      shell,
      display,
      pond,
      canvasRenderSize: canvas ? { width: canvas.width, height: canvas.height } : null,
    };
  });
  console.log("Mobile Landscape Geometry (After):", JSON.stringify(geometry, null, 2));

  const screenshot = await page.screenshot();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "mobile_landscape_after.png"), screenshot);
  console.log("Saved mobile_landscape_after.png");

  await browser.close();
}

main().catch(console.error);
