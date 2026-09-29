import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = 'C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13';
const outPath = path.resolve(artifactDir, 'performance_hud_verified.png');

async function testHud() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('1. Navigating to http://localhost:5174');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('2. Pressing "D" to toggle performance HUD');
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(1000); // Allow rolling FPS to compute

  console.log('3. Asserting HUD elements');
  const hud = page.locator('.performance-hud');
  const hudCount = await hud.count();
  if (hudCount === 0) {
    throw new Error('Performance HUD was not found after pressing D');
  }

  const fpsText = await page.locator('.performance-hud__fps').textContent();
  const subText = await page.locator('.performance-hud__sub').textContent();
  const metaText = await page.locator('.performance-hud__meta').textContent();

  console.log('   ✓ FPS Text:', fpsText?.trim());
  console.log('   ✓ Frame time:', subText?.trim());
  console.log('   ✓ Meta:', metaText?.trim());

  await page.screenshot({ path: outPath });
  console.log('   ✓ Screenshot saved to:', outPath);

  await browser.close();
  console.log('PASS: Performance HUD verified successfully!');
}

testHud().catch((err) => {
  console.error(err);
  process.exit(1);
});
