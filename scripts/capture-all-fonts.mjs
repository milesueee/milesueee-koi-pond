import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13";

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
  await page.waitForTimeout(1000);

  // Enter Ambient Mode
  console.log("Clicking Ambient button to enter Ambient Mode...");
  const ambientBtn = page.locator(".control-button--ambient");
  await ambientBtn.click();
  await page.waitForTimeout(500);

  console.log("Waiting 10.5 seconds for screensaver clock to activate...");
  await page.waitForTimeout(10500);
  await page.waitForSelector(".screensaver-clock--visible", { timeout: 3000 });

  const setClockFont = async (fontClass) => {
    await page.evaluate((cls) => {
      const clock = document.querySelector(".screensaver-clock");
      if (clock) {
        clock.classList.remove(
          "screensaver-clock--sans",
          "screensaver-clock--serif",
          "screensaver-clock--mono",
          "screensaver-clock--pixel"
        );
        clock.classList.add(cls);
      }
    }, fontClass);
    await page.waitForTimeout(500);
  };

  // 1. Capture Mac Minimalist (Sans)
  console.log("Capturing 1. Mac Minimalist (Sans)...");
  await setClockFont("screensaver-clock--sans");
  const sansPath = path.join(ARTIFACT_DIR, "screensaver_font_sans.png");
  await page.screenshot({ path: sansPath });
  console.log(`Saved: ${sansPath}`);

  // 2. Capture Editorial Serif (Cormorant Garamond)
  console.log("Capturing 2. Editorial Serif (Cormorant Garamond)...");
  await setClockFont("screensaver-clock--serif");
  const serifPath = path.join(ARTIFACT_DIR, "screensaver_font_serif.png");
  await page.screenshot({ path: serifPath });
  console.log(`Saved: ${serifPath}`);

  // 3. Capture JetBrains Mono
  console.log("Capturing 3. JetBrains Mono...");
  await setClockFont("screensaver-clock--mono");
  const monoPath = path.join(ARTIFACT_DIR, "screensaver_font_mono.png");
  await page.screenshot({ path: monoPath });
  console.log(`Saved: ${monoPath}`);

  // 4. Capture 8-bit Retro (Pixelify Sans)
  console.log("Capturing 4. 8-bit Retro (Pixelify Sans)...");
  await setClockFont("screensaver-clock--pixel");
  const pixelPath = path.join(ARTIFACT_DIR, "screensaver_font_pixel.png");
  await page.screenshot({ path: pixelPath });
  console.log(`Saved: ${pixelPath}`);

  // 5. Demonstrate sunset atmospheric accent matching
  console.log("Capturing 5. Sunset Weather Atmosphere Accent Matching...");
  await page.evaluate(() => {
    // Dispatch weather change or simulate sunset accent on clock
    const clock = document.querySelector(".screensaver-clock");
    if (clock) {
      clock.classList.remove(
        "screensaver-clock--sans",
        "screensaver-clock--serif",
        "screensaver-clock--mono",
        "screensaver-clock--pixel"
      );
      clock.classList.add("screensaver-clock--sans");
      clock.style.setProperty("--clock-color", "rgba(255, 232, 216, 0.98)");
      clock.style.setProperty("--clock-date-color", "rgba(255, 206, 182, 0.92)");
      clock.style.setProperty("--clock-glow", "rgba(255, 105, 40, 0.55)");
    }
  });
  await page.waitForTimeout(400);
  const sunsetPath = path.join(ARTIFACT_DIR, "screensaver_sunset_adaptive.png");
  await page.screenshot({ path: sunsetPath });
  console.log(`Saved: ${sunsetPath}`);

  await browser.close();
  console.log("Captured all screenshots successfully!");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
