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

- Projects: `src/data/projects.ts` (homepage shows `featured` + `showOnHome`; full list at `/projects`)
- Skills / EmailJS / About copy: `src/data/site.ts`
- New project screenshots: drop a source into `src/assets/images/`, add it to `scripts/optimize-images.mjs`, run `npm run optimize-images`, then set `image` / `imageWidth` / `imageHeight` / `alt` on the project. Omit `image` to use the default placeholder.

## Island explorer (`/fly/`)

A playable low-poly helicopter prototype on its own route. Fly between islands, land on a helipad, walk up to a sign, and open the same About / Skills / Projects / Contact content the main site uses (no duplicated copy).

- **Stack:** plain [three.js](https://threejs.org/) with a small arcade flight model (no React Three Fiber / Rapier). Keeps the download smaller and avoids pulling React onto a mostly static Astro site.
- **Isolation:** the 3D code is only loaded from `/fly/`. Homepage and `/projects/` stay free of three.js. CI runs `scripts/check-fly-isolation.mjs` after the build to prove that.
- **Controls:** keyboard on desktop, on-screen sticks on touch. Esc closes panels. Prefer reduced motion? You get a static island map instead.
- **Assets:** everything is built from primitives (no third-party models). The helicopter is a low-poly Guimbal Cabri G2 silhouette.
- **Tests:** `npm test` covers landing checks, content mapping, flight step logic, and the walk cycle.

```bash
npm test
npm run build
node scripts/check-fly-isolation.mjs
```
