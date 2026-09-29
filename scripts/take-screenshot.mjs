import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = 'C:\\Users\\Eda Jane Parao\\.gemini\\antigravity-ide\\brain\\4a2e566b-589c-4c7d-a092-beddd2453d13';
const outPath = path.resolve(artifactDir, 'pwa_nagomi_verified.png');

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // Allow fish and pond to settle
  await page.screenshot({ path: outPath });
  console.log('Screenshot saved to:', outPath);
  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
