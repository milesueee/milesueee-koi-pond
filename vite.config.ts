import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "audio/ambient-river-v1.m4a",
        "nagomi-social-v1.png",
        "robots.txt",
        "sitemap.xml",
      ],
      manifest: {
        name: "milesueee ∙ nagomi",
        short_name: "Nagomi",
        description: "A calm, interactive procedural koi pond with responsive fish, ripples, weather, lotus leaves, and ambient river sound.",
        theme_color: "#0b1514",
        background_color: "#0b1514",
        display: "standalone",
        orientation: "any",
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
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,m4a}"],
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
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
