export type Project = {
  title: string
  description: string
  live_url: string
  github_repo: string
  /** Basename under /assets/images/{name}-{width}.{avif,webp} */
  image: string
  imageWidth: number
  imageHeight: number
  skills: string
  featured?: boolean
}

export const projects: Project[] = [
  {
    title: 'Markdown website builder',
    description:
      'Frontend pages from markdown, YAML frontmatter, and a bit of CSS, compressed into the URL. Share a link and the page renders — no accounts, no backend. The editor shows a live preview, and optional AI edits for an element or the whole page go through a Cloudflare Worker so the OpenAI key never reaches the browser.',
    live_url: 'https://markdown-website-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/markdown-website-builder',
    image: 'markdown-website-builder',
    imageWidth: 1920,
    imageHeight: 980,
    skills: 'React, TypeScript, Cloudflare, OpenAI',
    featured: true,
  },
  {
    title: 'ZWO Builder',
    description:
      'A Zwift workout editor I built because clicking intervals together in-game is slow. Drag blocks around, describe a change in plain English, export a .zwo. Workouts stay on the the browser in IndexedDB.',
    live_url: 'https://zwo-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/zwift-workout-creator',
    image: 'zwift-workout-builder',
    imageWidth: 1919,
    imageHeight: 875,
    skills: 'React, TypeScript, Cloudflare, OpenAI',
    featured: true,
  },
  {
    title: 'URL shortener',
    description:
      'Rails redirect service with webhook-backed click counts. The interesting bit was keeping the hop itself cheap.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/url_shortener',
    image: 'url-shortener',
    imageWidth: 1917,
    imageHeight: 877,
    skills: 'Ruby on Rails',
  },
  {
    title: 'Static site creator',
    description:
      'Rails app to create and host static sites. Edit the files in the browser, publish under /s/:name, and the assets live on Cloudflare R2.',
    live_url: 'https://static-site-creator.fly.dev',
    github_repo: 'https://github.com/MaysenTG/ror-gcs-site-creator',
    image: 'static-site-generator',
    imageWidth: 1280,
    imageHeight: 800,
    skills: 'Ruby on Rails, Hotwire, Cloudflare R2',
  },
  {
    title: 'Link in bio',
    description:
      'Link in bio app with an editable bio page. The app uses Hotwire/StimulusJS to update the bio page in real time. Links are orderable to prioritize the most important links.',
    live_url: 'https://linkinbio.fly.dev/',
    github_repo: 'https://github.com/MaysenTG/RoR-link_in_bio',
    image: 'linkinbio',
    imageWidth: 3024,
    imageHeight: 1540,
    skills: 'Ruby on Rails, Hotwire/StimulusJS, Cloudflare R2 asset storage',
  },
  {
    title: 'This site',
    description:
      'Personal site in Astro with a cache-first service worker. The project list is a JS file on purpose — adding something new should not involve a CMS.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/personal-portfolio',
    image: 'personal-portfolio',
    imageWidth: 1919,
    imageHeight: 854,
    skills: 'Astro, Service Worker',
  },
  {
    title: 'Fake API',
    description:
      'Sinatra app that stands up REST endpoints for testing. OpenAI fills in the responses, then they get cached so you are not paying for the same fake payload twice.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/fake-api',
    image: 'fake-api',
    imageWidth: 3018,
    imageHeight: 1524,
    skills:
      'Sinatra (Ruby), RESTful APIs, JSON formatted responses from OpenAI, agressive caching',
  },
]

export const projectImageWidths = [400, 800, 1200] as const
export const heroImageWidths = [640, 960, 1280, 1600] as const
