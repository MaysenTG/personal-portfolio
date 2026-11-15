import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const marker = 'fly-3d-bundle'
const threeMarker = 'THREE.WebGLRenderer'

function read(file) {
  return readFileSync(file, 'utf8')
}

function resolveHtml(candidates) {
  const found = candidates.find((candidate) => existsSync(path.join(dist, candidate)))
  if (!found) throw new Error(`Missing HTML. Looked for ${candidates.join(', ')}`)
  return path.join(dist, found)
}

function assetRefs(code) {
  const refs = []
  const pattern = /["']([^"']+\.(?:js|css))["']/g
  for (const match of code.matchAll(pattern)) refs.push(match[1])
  return refs
}

function resolveRef(fromFile, ref) {
  if (ref.startsWith('/')) return path.join(dist, ref)
  if (ref.startsWith('./') || ref.startsWith('../')) return path.resolve(path.dirname(fromFile), ref)
  // Vite dep maps sometimes list site-root paths without a leading slash.
  if (ref.startsWith('_astro/')) return path.join(dist, ref)
  return null
}

function graphFrom(htmlPath) {
  const html = read(htmlPath)
  const files = []
  const texts = [html]
  const queue = assetRefs(html)
    .map((ref) => resolveRef(htmlPath, ref))
    .filter((file) => file !== null)
  const seen = new Set()
  while (queue.length) {
    const file = queue.pop()
    if (!file || seen.has(file) || !existsSync(file)) continue
    seen.add(file)
    files.push(file)
    const code = read(file)
    texts.push(code)
    if (!file.endsWith('.js')) continue
    for (const spec of assetRefs(code)) {
      const next = resolveRef(file, spec)
      if (next) queue.push(next)
    }
  }
  return { files, texts }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const home = graphFrom(resolveHtml(['index.html']))
const projects = graphFrom(resolveHtml(['projects/index.html', 'projects.html']))
const fly = graphFrom(resolveHtml(['fly/index.html', 'fly.html']))

for (const [name, graph] of [
  ['homepage', home],
  ['projects', projects],
]) {
  const joined = graph.texts.join('\n')
  assert(!joined.includes(marker), `${name} graph includes the 3D bundle marker`)
  assert(!joined.includes(threeMarker), `${name} graph includes Three.js`)
  assert(!joined.includes('fly-skip'), `${name} graph includes the fly page stylesheet`)
}

const flyJoined = fly.texts.join('\n')
assert(flyJoined.includes(marker), 'fly page never reaches the 3D bundle')
assert(flyJoined.includes(threeMarker), 'fly page 3D bundle does not include Three.js')
assert(flyJoined.includes('Skip to site'), 'fly page is missing Skip to site')

const heavy = new Set()
for (const file of fly.files) {
  const code = read(file)
  if (code.includes(marker) || code.includes(threeMarker)) heavy.add(path.basename(file))
}
assert(heavy.size > 0, 'no fly chunk contained the 3D markers')

// The fly page shell must lazy-load the 3D chunks, never import them statically.
const flyHtmlPath = resolveHtml(['fly/index.html', 'fly.html'])
const flyHtml = read(flyHtmlPath)
const flyShell = assetRefs(flyHtml)
  .map((ref) => resolveRef(flyHtmlPath, ref))
  .find((file) => file && /index\.astro_astro_type_script/.test(file))
assert(flyShell && existsSync(flyShell), 'missing fly page shell script')
{
  const code = read(flyShell)
  assert(!code.includes(marker), `fly shell embeds the 3D marker`)
  assert(!code.includes(threeMarker), `fly shell embeds Three.js`)
  assert(
    !/\bfrom\s*["']\.\/fly-scene[^"']*["']/.test(code),
    `fly shell statically imports fly-scene`,
  )
  assert(
    !/\bfrom\s*["']\.\/fly-three[^"']*["']/.test(code),
    `fly shell statically imports fly-three`,
  )
  assert(
    /import\s*\(\s*[`'"]\.\/fly-scene/.test(code),
    `fly shell never lazy-loads fly-scene`,
  )
}

const serviceWorkers = readdirSync(dist).filter((name) => name === 'sw.js' || name.startsWith('workbox-'))
assert(serviceWorkers.length > 0, 'service worker was not emitted')
const swText = serviceWorkers.map((name) => read(path.join(dist, name))).join('\n')
const precacheMatch = swText.match(/precacheAndRoute\(\[([\s\S]*?)\]/)
assert(precacheMatch, 'could not find precacheAndRoute list')
const precache = precacheMatch[1]
for (const fileName of heavy) {
  assert(!precache.includes(fileName), `service worker precaches 3D chunk ${fileName}`)
}
assert(!/fly-three[^"]*\.js/.test(precache), 'service worker precaches a fly-three file')
assert(!/fly-scene[^"]*\.js/.test(precache), 'service worker precaches a fly-scene file')

console.log(`Fly bundle stays off the homepage. 3D chunks: ${[...heavy].join(', ')}`)
