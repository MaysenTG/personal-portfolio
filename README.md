# Maysen Greenwood — Portfolio

Static personal site rebuilt in **Astro** for near-zero JS and sub-100ms repeat loads via an aggressive cache-first service worker.

## Why Astro

- Ships HTML/CSS by default; JS only for nav + contact form
- Workbox PWA: CacheFirst for pages, hashed assets, and the hero image
- Cloudflare `_headers` for immutable long-cache on `/_astro/*` and `/assets/*`

## Prerequisites

- Node.js **22.12+** (Astro 7 minimum; **Node 26** recommended — see `.nvmrc`)
- npm 9.6.5+

## Setup

```bash
npm install
npm run dev
```

Visit http://localhost:4321

## Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder (Cloudflare Pages, Netlify, or any static host). `_headers` is picked up automatically on Cloudflare Pages.

## Stack

| Package | Notes |
|---------|--------|
| Astro **7.3.5** | Rust compiler, Vite 8 / Rolldown, queued rendering |
| TypeScript **7** | Native compiler (faster `tsc`). Astro’s `astro check` / language-server still need TS 6 if you add them later |
| vite-plugin-pwa + `@vite-pwa/astro` | Cache-first SW (`@vite-pwa/astro` peers Astro ≤5; override allows Astro 7) |

## Content

- Projects: `src/data/projects.ts`
- Skills / EmailJS: `src/data/site.ts`
