import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const faviconPath = path.resolve(publicDir, 'favicon.svg');

const svgRaw = fs.readFileSync(faviconPath, 'utf8');

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const targets = [
    { name: 'pwa-192x192.png', width: 192, height: 192, maskable: false },
    { name: 'pwa-512x512.png', width: 512, height: 512, maskable: false },
    { name: 'apple-touch-icon.png', width: 180, height: 180, maskable: false },
    { name: 'pwa-maskable-512x512.png', width: 512, height: 512, maskable: true },
  ];

  for (const target of targets) {
    let htmlContent = '';
    if (target.maskable) {
      // For maskable icon: full-bleed background (#0b1514 or #1d665f) with artwork padded to 80% safe-zone
      const innerSize = Math.round(target.width * 0.75);
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${target.width}px;
              height: ${target.height}px;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #0b1514;
              overflow: hidden;
            }
            .icon-wrapper {
              width: ${innerSize}px;
              height: ${innerSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="icon-wrapper">
            ${svgRaw}
          </div>
        </body>
        </html>
      `;
    } else {
      // Standard icon: clean fit
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${target.width}px;
              height: ${target.height}px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
              overflow: hidden;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          ${svgRaw}
        </body>
        </html>
      `;
    }

    await page.setViewportSize({ width: target.width, height: target.height });
    await page.setContent(htmlContent, { waitUntil: 'load' });
    const outPath = path.resolve(publicDir, target.name);
    await page.screenshot({ path: outPath, omitBackground: !target.maskable });
    console.log(`Generated: ${target.name} (${target.width}x${target.height}) -> ${outPath}`);
  }

  await browser.close();
  console.log('All PWA icons generated successfully.');
}

generate().catch(err => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
