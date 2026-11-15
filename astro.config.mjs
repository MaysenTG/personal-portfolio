import { defineConfig } from 'astro/config'
import AstroPWA from '@vite-pwa/astro'

export default defineConfig({
  site: 'https://maysengreenwood.com',
  // HTML-aware compression: smaller markup while keeping spaces between inline elements
  compressHTML: true,
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssMinify: true,
      assetsInlineLimit: 4096,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'fly-three',
                test: /node_modules[\\/]three[\\/]/,
                priority: 30,
              },
              {
                name: 'fly-scene',
                test: (id) =>
                  /[\\/]src[\\/]fly[\\/]/.test(id) &&
                  !/[\\/]shell\.ts/.test(id) &&
                  !/[\\/]content\.ts/.test(id) &&
                  !/[\\/]island-ids\.ts/.test(id) &&
                  !id.includes('.test.ts'),
                priority: 20,
              },
            ],
          },
        },
      },
    },
  },
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Maysen Greenwood',
        short_name: 'Maysen',
        description:
          'Software developer in New Zealand, working on Dentally at Henry Schein One with Rails and Ember. I also build side projects such as Who Funds NZ and ZWO Builder.',
        theme_color: '#16141c',
        background_color: '#f4efe8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/images/pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,json,webmanifest}'],
        globIgnores: ['**/assets/images/**', '**/fly-three*', '**/fly-scene*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/images/'),
            // Revalidate in the background so a new deploy is picked up on the next visit
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('fly-three') || url.pathname.includes('fly-scene'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fly-3d',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pages',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
