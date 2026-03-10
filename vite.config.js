import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-192.png', 'logo-512.png', 'vite.svg'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'The Noble Quran',
        short_name: 'Quran',
        description: 'Read and listen to the Holy Quran with translations and tajweed.',
        theme_color: '#004d40',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://api.quran.com',
            handler: 'CacheFirst', // Use CacheFirst to be strictly offline-ready
            options: {
              cacheName: 'quran-api-cache',
              expiration: {
                maxEntries: 2000, // Increased to support all paginated pages of all 114 Surahs
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://verses.quran.foundation',
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-foundation-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'download.quranicaudio.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-audio-cache',
              expiration: {
                maxEntries: 114, // Roughly one Quran recitation
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              rangeRequests: true, // Crucial for audio/video playback
            },
          }
        ]
      }
    })
  ],
})
