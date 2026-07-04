import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Hirmify',
        short_name: 'Hirmify',
        description:
          'Hirmify — stream millions of songs, search artists and build your own library.',
        // Must match the app's real background (ink-950) so the splash
        // dissolves into the UI without a visible color jump
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Album/artist artwork is immutable — safe to cache aggressively
            urlPattern: /^https:\/\/c\.saavncdn\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'artwork',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // Font CSS + files served from SW cache: no network on the
            // critical path of later cold starts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 12, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            // Top charts: render instantly from cache, refresh in the background
            urlPattern: /\/api\/getTop(English|Hindi)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'charts',
              expiration: { maxEntries: 4, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            // Artist pages change slowly too (follower counts, top songs)
            urlPattern: /\/api\/getArtistById\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'artists',
              expiration: { maxEntries: 40, maxAgeSeconds: 6 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
});
