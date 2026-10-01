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

  // 2. Test right-click: Drop food pellets
  await canvas.click({ position: { x: 500, y: 320 }, button: 'right' });
  await page.waitForTimeout(300);

  const initialPellets = await page.evaluate(() => {
    const pellets = window.nagomiRuntime?.renderer.getFood().getPellets() ?? [];
    return pellets.map(p => ({ id: p.id, x: p.x, y: p.y, depth: p.depth, vx: p.vx, vy: p.vy }));
  });
  console.log('Spawned pellets count:', initialPellets.length, 'depths:', initialPellets.map(p => p.depth));

  // 3. Test ripple impact on pellets: Left click nearby at (450, 320) - 50px away
  await canvas.click({ position: { x: 450, y: 320 }, button: 'left' });
  // Wait for the ripple wave to expand across the 50px distance (~0.7s)
  await page.waitForTimeout(700);

  const afterRipplePellets = await page.evaluate(() => {
    const pellets = window.nagomiRuntime?.renderer.getFood().getPellets() ?? [];
    return pellets.map(p => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, depth: p.depth }));
  });
  console.log('After ripple hit, first pellet velocity:', afterRipplePellets[0]?.vx, afterRipplePellets[0]?.vy);

  const ripplePushScreenshotPath = path.resolve(artifactDir, 'pellets_ripple_reaction.png');
  await page.screenshot({ path: ripplePushScreenshotPath });
  console.log('Saved ripple push screenshot:', ripplePushScreenshotPath);

  // 4. Test sinking progression: Advance a pellet's age into sinking phase to verify depth and visual darkening
  await page.evaluate(() => {
    const food = window.nagomiRuntime?.renderer.getFood();
    if (food) {
      food.spawnAt({ x: 280, y: 400 }, 4);
      for (const p of food.getPellets()) {
        if (p.x < 350) {
          p.age = p.floatDuration + 2.5; // halfway through sinking
        }
      }
    }
  });

  await page.waitForTimeout(300);

  const sinkingPellets = await page.evaluate(() => {
    const pellets = window.nagomiRuntime?.renderer.getFood().getPellets() ?? [];
    return pellets.map(p => ({ id: p.id, depth: p.depth, age: p.age }));
  });
  console.log('Sinking pellets state:', sinkingPellets);

  const sinkingScreenshotPath = path.resolve(artifactDir, 'pellets_sinking_depth.png');
  await page.screenshot({ path: sinkingScreenshotPath });
  console.log('Saved sinking screenshot:', sinkingScreenshotPath);

  await browser.close();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
