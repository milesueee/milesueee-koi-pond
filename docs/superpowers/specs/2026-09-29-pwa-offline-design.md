# Nagomi PWA & Offline Functionality Design Specification

## Overview
Transform Nagomi (milesueee-koi-pond) into a Progressive Web App (PWA) with complete offline functionality. When installed or bookmarked on any device (desktop, iOS, Android), users can open and interact with the procedural koi pond, water ripples, rain weather, lotus leaves, ambient river audio, and synthesized procedural sounds entirely offline without an active network connection.

## User Goals & Requirements
- **Installability**: Standalone web app compliant with PWA install criteria (valid manifest, service worker with fetch handler, icons, standalone display mode).
- **Offline Functionality**: All critical assets (app shell, JavaScript/CSS bundles, WOFF2 fonts, SVG assets, and the ambient audio track `ambient-river-v1.m4a`) are cached so the app loads and functions seamlessly when offline.
- **Minimalist Aesthetic**: Silent background caching and native browser install prompts with no obtrusive UI banners or clutter.

## Technical Architecture

### 1. Tooling & Dependencies
- Add `vite-plugin-pwa` (supporting Vite 8) to `devDependencies`.
- Add `workbox-range-requests` / Workbox runtime caching for handling `.m4a` audio streaming.

### 2. Web App Manifest (`manifest.webmanifest`)
Configured in `vite.config.ts` via `VitePWA`:
- `name`: `"Nagomi ∙ 和み"`
- `short_name`: `"Nagomi"`
- `description`: `"A calm, interactive koi pond with responsive fish, ripples, weather, lotus leaves, and ambient river sound."`
- `theme_color`: `"#0b1514"`
- `background_color`: `"#0b1514"`
- `display`: `"standalone"`
- `orientation`: `"any"`
- `start_url`: `"/"`
- `scope`: `"/"`
- `categories`: `["entertainment", "relaxation", "lifestyle"]`
- `icons`:
  - `pwa-192x192.png` (192x192, image/png)
  - `pwa-512x512.png` (512x512, image/png)
  - `pwa-maskable-512x512.png` (512x512, image/png, purpose: "maskable")

### 3. Service Worker & Caching Strategy
- **Registration**: `registerType: 'autoUpdate'` with registration script imported in `src/main.tsx` via `virtual:pwa-register`.
- **Pre-caching**:
  - Precache build output: HTML, JS, CSS, SVG, PNG, and font files (`**/*.{js,css,html,ico,png,svg,woff2}`).
- **Runtime Caching for Audio**:
  - Match URL pattern: `/\.(?:m4a|mp3|wav|ogg)$/` or `/audio/.*`
  - Strategy: `CacheFirst`
  - Cache Name: `nagomi-audio-cache`
  - Expiration: maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60
  - Workbox Range Requests plugin: Enables byte-range requests for audio playback seeking in Safari/iOS and Chromium.

### 4. Icon Generation & Assets
- Use canvas/Node script to render the SVG koi artwork from `public/favicon.svg` with appropriate padding into:
  - `public/pwa-192x192.png`
  - `public/pwa-512x512.png`
  - `public/pwa-maskable-512x512.png`
  - `public/apple-touch-icon.png` (180x180)

### 5. HTML Meta Updates
In `index.html`:
- `<meta name="theme-color" content="#0b1514" />`
- `<meta name="mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
- `<meta name="apple-mobile-web-app-title" content="Nagomi" />`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`

## Verification & Testing
1. **Automated Offline Verification**:
   - Playwright automated test loading the preview/dev server, verifying service worker registration, activating offline mode (`context.setOffline(true)`), reloading the page, and asserting that:
     - The page status is 200.
     - The pond 3D canvas and fish simulation initialize.
     - The audio synthesizers and ambient river player initialize without error.
2. **Build and Unit Test Suite**:
   - `npm.cmd test -- --run` (all 44 unit tests pass).
   - `npm.cmd run build` (clean TypeScript compilation and PWA asset manifest generation).
