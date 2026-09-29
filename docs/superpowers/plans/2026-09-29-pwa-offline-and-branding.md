# PWA, Offline Functionality & Branding Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Nagomi into a full Progressive Web App (PWA) that installs natively, works 100% offline (including app shell, fonts, procedural sounds, and the ambient river audio), and update the brand name across the codebase from "milesueee-koi-pond" to "milesueee ∙ nagomi".

**Architecture:** Use `vite-plugin-pwa` with Workbox to configure automatic precaching of all build assets (HTML, JS, CSS, fonts, icons) and runtime CacheFirst caching with range-request streaming for the ambient `.m4a` river audio. Generate standard PWA icons (192, 512, maskable, apple-touch-icon) from the koi vector emblem, register the service worker silently, and verify true offline functionality with Playwright.

**Tech Stack:** React 19, TypeScript, Vite 8, `vite-plugin-pwa`, Workbox, Three.js, Web Audio API, Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-29-pwa-offline-design.md`](file:///c:/Users/Eda%20Jane%20Parao/WebstormProjects/nagomi/docs/superpowers/specs/2026-09-29-pwa-offline-design.md)

## Global Constraints
- Target brand name: `"milesueee ∙ nagomi"` for human-facing titles, headings, and metadata; `"milesueee-nagomi"` for URL/npm package names.
- Minimalist PWA approach: No obtrusive in-app banners or toasts; rely on browser native install prompts and silent background caching.
- Offline scope: Entire application must function offline, including procedural Web Audio and the ambient audio track `audio/ambient-river-v1.m4a`.
- Theme color: `#0b1514` (deep pond water).
- All 44 existing unit tests must continue to pass; production build `npm.cmd run build` must succeed without TypeScript errors.

## Review Focus
1. Brand name consistency: Ensure no leftover "milesueee-koi-pond" references in HTML title, headings, meta tags, schema, or dock branding.
2. Offline audio streaming: Workbox range-requests must be configured so seeking or streaming `.m4a` in Safari/Chromium succeeds from cache.
3. Offline reload resilience: Reloading the page in `context.setOffline(true)` must render the canvas and fish without blank screens or unhandled rejections.
4. Maskable icon safe-zone: `pwa-maskable-512x512.png` must have sufficient padding so the koi mark is not clipped on circular or rounded-rect Android icons.
5. Service worker registration clean-up: Service worker must register smoothly in production and preview without blocking initial paint.

---

### Task 1: Update Brand Name Across the Codebase to "milesueee ∙ nagomi"

**Files:**
- Modify: `src/app.tsx:914`
- Modify: `index.html:11-73`
- Modify: `package.json:2`
- Modify: `wrangler.jsonc:3`
- Modify: `README.md:1-3`
- Modify: `docs/how-it-works.md:1-26`
- Modify: `docs/superpowers/specs/2026-09-29-pwa-offline-design.md:4`

**Interfaces:**
- Consumes: Existing brand name strings
- Produces: Updated brand name `"milesueee ∙ nagomi"` across all UI headers, document titles, SEO metadata, and documentation

- [ ] **Step 1: Update brand wordmark in `src/app.tsx`**
Replace line 914:
```tsx
<h1 className="brand-wordmark">milesueee ∙ nagomi</h1>
```

- [ ] **Step 2: Update HTML metadata, title, schema, and noscript in `index.html`**
Update meta description, `og:site_name`, `og:title`, `og:image:alt`, `twitter:title`, `twitter:image:alt`, JSON-LD schema, `<title>`, and `<noscript>` to use `"milesueee ∙ nagomi"`.

- [ ] **Step 3: Update package metadata and documentation**
Update `package.json` name to `"milesueee-nagomi"`, `wrangler.jsonc` name to `"milesueee-nagomi"`, `README.md`, and `docs/how-it-works.md` to reference `"milesueee ∙ nagomi"`.

- [ ] **Step 4: Verify tests and run lint check**
Run: `npm.cmd test -- --run`
Expected: 44 tests passing.

- [ ] **Step 5: Commit brand name updates**
```bash
git add src/app.tsx index.html package.json wrangler.jsonc README.md docs/how-it-works.md docs/superpowers/specs/2026-09-29-pwa-offline-design.md
git commit -m "chore: update brand name to milesueee ∙ nagomi"
```

---

### Task 2: Generate PWA Icons from Koi Artwork

**Files:**
- Create: `scripts/generate-pwa-icons.mjs`
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`
- Create: `public/pwa-maskable-512x512.png`
- Create: `public/apple-touch-icon.png`

**Interfaces:**
- Consumes: `public/favicon.svg` (koi vector emblem)
- Produces: PNG icons for PWA manifest and iOS home screen

- [ ] **Step 1: Write icon generation script using Playwright**
Create `scripts/generate-pwa-icons.mjs` that loads `favicon.svg` into headless Chromium and takes crisp pixel snapshots at 192x192, 512x512, 180x180 (apple-touch-icon), and 512x512 with 20% safe-zone margin (maskable).

- [ ] **Step 2: Run icon generation script**
Run: `node scripts/generate-pwa-icons.mjs`
Expected: Outputs 4 PNG files in `public/`.

- [ ] **Step 3: Verify icon dimensions and non-empty files**
Check `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/pwa-maskable-512x512.png`, and `public/apple-touch-icon.png`.

- [ ] **Step 4: Commit generated PWA icons and generator script**
```bash
git add scripts/generate-pwa-icons.mjs public/pwa-192x192.png public/pwa-512x512.png public/pwa-maskable-512x512.png public/apple-touch-icon.png
git commit -m "feat(pwa): generate PWA icons and apple touch icon from koi artwork"
```

---

### Task 3: Install & Configure `vite-plugin-pwa` with Offline Workbox Rules

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `public/audio/ambient-river-v1.m4a`
- Produces: PWA service worker with auto-update, web app manifest, precache manifest, and CacheFirst audio runtime caching

- [ ] **Step 1: Install `vite-plugin-pwa`**
Run: `npm.cmd install -D vite-plugin-pwa`
Expected: Successfully installs `vite-plugin-pwa`.

- [ ] **Step 2: Configure `vite.config.ts` with `VitePWA`**
Import `VitePWA` from `vite-plugin-pwa`. Configure:
```typescript
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg", "apple-touch-icon.png", "audio/ambient-river-v1.m4a"],
  manifest: {
    name: "milesueee ∙ nagomi",
    short_name: "Nagomi",
    description: "A calm, interactive procedural koi pond with responsive fish, ripples, weather, lotus leaves, and ambient river sound.",
    theme_color: "#0b1514",
    background_color: "#0b1514",
    display: "standalone",
    start_url: "/",
    scope: "/",
    categories: ["entertainment", "relaxation", "lifestyle"],
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/audio/") || /\.(?:m4a|mp3|wav|ogg)$/.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "nagomi-audio-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
          rangeRequests: true,
        },
      },
    ],
  },
})
```

- [ ] **Step 3: Register service worker in `src/main.tsx`**
Add:
```typescript
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });
```
Add TypeScript reference definition or declaration file `src/vite-env.d.ts` if needed for `virtual:pwa-register`.

- [ ] **Step 4: Update `index.html` head tags**
Add:
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Nagomi" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```
Update `<meta name="theme-color" content="#0b1514" />`.

- [ ] **Step 5: Verify build succeeds**
Run: `npm.cmd run build`
Expected: Build outputs `dist/manifest.webmanifest` and `dist/sw.js` with zero errors.

- [ ] **Step 6: Commit PWA plugin configuration and registration**
```bash
git add package.json package-lock.json vite.config.ts src/main.tsx index.html src/vite-env.d.ts
git commit -m "feat(pwa): integrate vite-plugin-pwa with manifest and audio runtime caching"
```

---

### Task 4: Automated Offline Verification Script & Testing

**Files:**
- Create: `scripts/test-offline.mjs`

**Interfaces:**
- Consumes: Production build / preview server (`http://localhost:4173` or dev server `http://localhost:5174`)
- Produces: Verified proof of offline page load, canvas rendering, and cached audio stream playback

- [ ] **Step 1: Write automated offline test script**
Create `scripts/test-offline.mjs` using Playwright:
1. Start `npm run preview` on port 4173 (or use running server).
2. Launch Chromium browser.
3. Navigate to the app. Wait for `ServiceWorker` to register and become active (`state === 'activated'`).
4. Wait for audio cache `nagomi-audio-cache` to populate with `/audio/ambient-river-v1.m4a`.
5. Trigger `context.setOffline(true)`.
6. Reload page (`page.reload({ waitUntil: 'networkidle' })`).
7. Assert:
   - Page URL loads without network error.
   - Canvas element `canvas` exists and has nonzero dimensions.
   - Brand title displays `"milesueee ∙ nagomi"`.
   - Audio buffer fetch `/audio/ambient-river-v1.m4a` inside page context returns `status: 200` from cache while offline.
8. Log test pass and exit with 0.

- [ ] **Step 2: Run offline verification script**
Run: `node scripts/test-offline.mjs`
Expected: "PASS: Nagomi loads and operates 100% offline with cached audio."

- [ ] **Step 3: Commit verification test script**
```bash
git add scripts/test-offline.mjs
git commit -m "test(pwa): add automated offline playback and rendering verification test"
```

---

### Task 5: Final Validation & Integration

**Files:**
- Review: all modified files

- [ ] **Step 1: Run full test suite**
Run: `npm.cmd test -- --run`
Expected: 44 unit tests pass.

- [ ] **Step 2: Run production build**
Run: `npm.cmd run build`
Expected: Success with clean TypeScript checks and bundled service worker assets.

- [ ] **Step 3: Manual sanity check in browser**
Check preview / dev server in browser to ensure UI, rain particles, audio synthesizer, and lotus leaves function smoothly.
