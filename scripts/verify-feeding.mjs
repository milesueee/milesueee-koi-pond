import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = 'C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13';

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const canvas = page.locator('canvas#pond');

  // 1. Test left-click: Should only create ripple, not trigger targetActive / koi call
  const targetActiveBefore = await page.evaluate(() => {
    return window.nagomiRuntime?.school.targetActive ?? null;
  });
  console.log('Before left click targetActive:', targetActiveBefore);

  await canvas.click({ position: { x: 250, y: 250 }, button: 'left' });
  await page.waitForTimeout(100);

  const targetActiveAfterLeftClick = await page.evaluate(() => {
    return window.nagomiRuntime?.school.targetActive ?? null;
  });
  console.log('After left click targetActive:', targetActiveAfterLeftClick);

  const leftClickScreenshotPath = path.resolve(artifactDir, 'left_click_ripple_only.png');
  await page.screenshot({ path: leftClickScreenshotPath });
  console.log('Saved left click screenshot:', leftClickScreenshotPath);

  // 2. Test right-click: Should drop food and activate school feeding attraction
  await canvas.click({ position: { x: 400, y: 300 }, button: 'right' });
  await page.waitForTimeout(200);

  const feedingState = await page.evaluate(() => {
    const foodCount = window.nagomiRuntime?.renderer.getFood().getPellets().length ?? 0;
    const targetActive = window.nagomiRuntime?.school.targetActive ?? false;
    return { foodCount, targetActive };
  });
  console.log('After right click feeding state:', feedingState);

  // Wait a second for koi to swim toward food
  await page.waitForTimeout(1200);
  const feedingScreenshotPath = path.resolve(artifactDir, 'right_click_feeding_koi.png');
  await page.screenshot({ path: feedingScreenshotPath });
  console.log('Saved feeding screenshot:', feedingScreenshotPath);

  // Wait for koi to eat food pellets
  await page.waitForTimeout(2500);
  const afterEatingState = await page.evaluate(() => {
    const foodCount = window.nagomiRuntime?.renderer.getFood().getPellets().length ?? 0;
    return { foodCount };
  });
  console.log('After feeding eating state:', afterEatingState);

  const afterEatingScreenshotPath = path.resolve(artifactDir, 'koi_eating_food.png');
  await page.screenshot({ path: afterEatingScreenshotPath });
  console.log('Saved after eating screenshot:', afterEatingScreenshotPath);

  await browser.close();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
