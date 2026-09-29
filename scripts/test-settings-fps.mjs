import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = 'C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13';
const outPath = path.resolve(artifactDir, 'settings_fps_toggle_verified.png');

async function testSettings() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('1. Navigating to http://localhost:5174');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('2. Opening settings panel');
  await page.locator('.settings-trigger').click();
  await page.waitForTimeout(800);

  console.log('3. Locating and clicking FPS label');
  await page.locator('label[for="quick-fps"]').click();
  await page.waitForTimeout(1000);

  console.log('5. Asserting Performance HUD is visible');
  const hud = page.locator('.performance-hud');
  if ((await hud.count()) === 0) {
    throw new Error('Performance HUD did not appear after toggling switch in settings');
  }

  const fpsText = await page.locator('.performance-hud__fps').textContent();
  console.log('   ✓ Live FPS in HUD:', fpsText?.trim());

  await page.screenshot({ path: outPath });
  console.log('   ✓ Screenshot saved to:', outPath);

  await browser.close();
  console.log('PASS: Settings FPS toggle verified successfully!');
}

testSettings().catch((err) => {
  console.error(err);
  process.exit(1);
});
