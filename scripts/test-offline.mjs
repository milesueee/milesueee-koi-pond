import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const PORT = 4178;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function runTest() {
  console.log('1. Starting Vite preview server on port', PORT);
  const previewProcess = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
    { cwd: rootDir, stdio: 'pipe', shell: true }
  );

  let serverStarted = false;
  previewProcess.stdout.on('data', (data) => {
    const str = data.toString();
    if (str.includes(String(PORT))) {
      serverStarted = true;
    }
  });

  previewProcess.stderr.on('data', (data) => {
    console.error('[preview err]:', data.toString());
  });

  // Wait for server to start
  for (let i = 0; i < 30; i++) {
    if (serverStarted) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  try {
    console.log('2. Navigating to Nagomi PWA at', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    console.log('3. Waiting for Service Worker to activate');
    const swActivated = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg && reg.active !== null;
    });

    if (!swActivated) {
      throw new Error('ServiceWorker was not registered or activated.');
    }
    console.log('   ✓ ServiceWorker is active');

    // Warm up the audio cache by fetching ambient-river-v1.m4a
    console.log('4. Warming up audio cache fetch');
    const onlineAudioStatus = await page.evaluate(async () => {
      const resp = await fetch('/audio/ambient-river-v1.m4a');
      return resp.status;
    });
    console.log('   ✓ Audio fetch status (online):', onlineAudioStatus);

    // Give Workbox a brief moment to write to CacheStorage
    await new Promise((r) => setTimeout(r, 1000));

    // Verify cache storage content
    const cacheKeys = await page.evaluate(async () => {
      const keys = await caches.keys();
      const assets = [];
      for (const k of keys) {
        const cache = await caches.open(k);
        const reqs = await cache.keys();
        assets.push({ cache: k, count: reqs.length });
      }
      return assets;
    });
    console.log('   ✓ Cache storage contents:', JSON.stringify(cacheKeys));

    console.log('5. Enabling OFFLINE mode (context.setOffline(true))');
    await context.setOffline(true);

    console.log('6. Reloading page completely offline');
    await page.reload({ waitUntil: 'networkidle' });

    console.log('7. Verifying offline DOM, Brand, and Canvas rendering');
    const pageTitle = await page.title();
    console.log('   ✓ Document title:', pageTitle);
    if (!pageTitle.includes('milesueee ∙ nagomi')) {
      throw new Error(`Expected title to include "milesueee ∙ nagomi", got "${pageTitle}"`);
    }

    const brandWordmark = await page.locator('.brand-wordmark').textContent();
    console.log('   ✓ Brand wordmark text:', brandWordmark?.trim());
    if (brandWordmark?.trim() !== 'milesueee ∙ nagomi') {
      throw new Error(`Expected brand wordmark to be "milesueee ∙ nagomi", got "${brandWordmark}"`);
    }

    const canvasExists = await page.locator('canvas').count();
    if (canvasExists === 0) {
      throw new Error('Canvas element was not rendered offline.');
    }
    console.log('   ✓ Three.js canvas element is mounted and rendering');

    console.log('8. Testing offline audio streaming from CacheStorage');
    const offlineAudioTest = await page.evaluate(async () => {
      try {
        const resp = await fetch('/audio/ambient-river-v1.m4a');
        const buf = await resp.arrayBuffer();
        return {
          ok: resp.ok,
          status: resp.status,
          bytes: buf.byteLength,
        };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    });

    console.log('   ✓ Offline audio result:', JSON.stringify(offlineAudioTest));
    if (!offlineAudioTest.ok || offlineAudioTest.bytes < 100000) {
      throw new Error(`Offline audio fetch failed or returned incomplete buffer: ${JSON.stringify(offlineAudioTest)}`);
    }

    console.log('9. Checking for unhandled page errors');
    if (errors.length > 0) {
      console.warn('   Page warnings/errors during offline session:', errors);
    } else {
      console.log('   ✓ Zero unhandled errors during offline session');
    }

    console.log('\n=========================================');
    console.log('PASS: milesueee ∙ nagomi functions 100% OFFLINE!');
    console.log('=========================================\n');
  } finally {
    try {
      await browser.close();
    } catch {}
    try {
      if (process.platform === 'win32' && previewProcess.pid) {
        spawn('taskkill', ['/pid', String(previewProcess.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        previewProcess.kill();
      }
    } catch {}
  }
}

runTest()
  .then(() => {
    setTimeout(() => process.exit(0), 500);
  })
  .catch((err) => {
    console.error('\nFAIL: Offline test encountered an error:', err);
    process.exit(1);
  });
