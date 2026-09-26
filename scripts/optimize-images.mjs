import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const sourceDir = path.join(root, 'src/assets/images')
const outDir = path.join(root, 'public/assets/images')

/** @type {Record<string, { widths: number[]; quality?: number }>} */
const jobs = {
  'hero-image.webp': { widths: [640, 960, 1280, 1600], quality: 78 },
  'zwift-workout-builder.png': { widths: [400, 800, 1200], quality: 75 },
  'url-shortener.webp': { widths: [400, 800, 1200], quality: 75 },
  'online-store.webp': { widths: [400, 800, 1200], quality: 75 },
  'static-site-generator.webp': { widths: [400, 800, 1200], quality: 75 },
  'linkinbio.webp': { widths: [400, 800, 1200], quality: 75 },
  'personal-portfolio.webp': { widths: [400, 800, 1200], quality: 75 },
  'fake-api.webp': { widths: [400, 800, 1200], quality: 75 },
}

await mkdir(outDir, { recursive: true })

/** @type {Record<string, { width: number; height: number; widths: number[] }>} */
const manifest = {}

for (const [filename, { widths, quality = 75 }] of Object.entries(jobs)) {
  const input = path.join(sourceDir, filename)
  const base = filename.replace(/\.(webp|png|jpe?g)$/i, '')
  const meta = await sharp(input).metadata()
  const srcW = meta.width ?? widths[widths.length - 1]
  const srcH = meta.height ?? Math.round(srcW * 9 / 16)

  for (const width of widths) {
    const height = Math.round((srcH / srcW) * width)
    const resized = sharp(input).resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    })

    await resized
      .clone()
      .avif({ quality: Math.max(quality - 8, 45), effort: 4 })
      .toFile(path.join(outDir, `${base}-${width}.avif`))

    await resized
      .clone()
      .webp({ quality, effort: 4 })
      .toFile(path.join(outDir, `${base}-${width}.webp`))
  }

  manifest[base] = {
    width: srcW,
    height: srcH,
    widths,
  }
  console.log(`✓ ${base} → ${widths.join(', ')}w`)
}

// Tiny UI icons (already sized in src/assets) — keep separate from pwa-icon.png
for (const icon of ['earth-white.png', 'github-logo-white.png']) {
  const input = path.join(sourceDir, icon)
  await sharp(input)
    .resize(36, 36)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, icon))
  console.log(`✓ ${icon}`)
}

await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log('Wrote manifest.json')
