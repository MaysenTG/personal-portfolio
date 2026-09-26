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
          'Software developer in New Zealand. Rails and C# at Henry Schein One, plus side projects like a Zwift workout builder.',
        theme_color: '#16141c',
        background_color: '#f4efe8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/assets/images/github-logo-white.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,json,webmanifest}'],
        globIgnores: ['**/assets/images/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'project-images',
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 365,
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
