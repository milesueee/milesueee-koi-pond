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

  // 1. Open Settings drawer
  const settingsBtn = page.getByRole('button', { name: /Settings/i });
  await settingsBtn.click();
  await page.waitForTimeout(600);

  // 2. Scroll to Plants & life section
  const pondRocksLabel = page.getByText('Pond rocks', { exact: true });
  await pondRocksLabel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const drawerScreenshotPath = path.resolve(artifactDir, 'quick_settings_rocks_slider.png');
  await page.screenshot({ path: drawerScreenshotPath });
  console.log('Saved drawer screenshot:', drawerScreenshotPath);

  // 3. Test changing visible rocks to 0
  const slider = page.getByLabel('Pond rocks');
  if (await slider.count() > 0) {
    // Fill/adjust slider
    await slider.focus();
    // Press Home to go to 0
    await page.keyboard.press('Home');
    await page.waitForTimeout(500);

    const zeroRocksPath = path.resolve(artifactDir, 'rocks_count_zero.png');
    await page.screenshot({ path: zeroRocksPath });
    console.log('Saved 0 rocks screenshot:', zeroRocksPath);

    // Press End to go to max
    await page.keyboard.press('End');
    await page.waitForTimeout(500);
    const maxRocksPath = path.resolve(artifactDir, 'rocks_count_max.png');
    await page.screenshot({ path: maxRocksPath });
    console.log('Saved max rocks screenshot:', maxRocksPath);
  }

  await browser.close();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
