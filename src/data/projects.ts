export type Project = {
  title: string
  description: string
  live_url: string
  github_repo: string
  /** Basename under /assets/images/{name}-{width}.{avif,webp} */
  image: string
  imageWidth: number
  imageHeight: number
  /** object-position for the cropped screenshot */
  imagePosition?: string
  alt: string
  skills: readonly string[]
  featured?: boolean
}

export const projects: Project[] = [
  {
    title: 'Static site creator',
    description:
      'Rails app to create and host static sites. Edit the files in the browser, publish under /s/:name, and the assets live on Cloudflare R2.',
    live_url: 'https://static-site-creator.fly.dev',
    github_repo: 'https://github.com/MaysenTG/ror-gcs-site-creator',
    image: 'static-site-generator',
    imageWidth: 1024,
    imageHeight: 511,
    alt: 'Gusto Cloud editor open on the HTML for a site called maysens-website',
    skills: ['Ruby on Rails', 'Hotwire', 'Cloudflare R2'],
    featured: true,
  },
  {
    title: 'ZWO Builder',
    description:
      'A Zwift workout editor I built because clicking intervals together in-game is slow. Drag blocks around, describe a change in plain English, export a .zwo. Workouts stay in the browser, in IndexedDB.',
    live_url: 'https://zwo-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/zwift-workout-creator',
    image: 'zwift-workout-builder',
    imageWidth: 1919,
    imageHeight: 875,
    alt: 'ZWO Builder editing a sweet spot workout, with the power profile in the center',
    skills: ['React', 'TypeScript', 'Cloudflare', 'OpenAI'],
    featured: true,
  },
  {
    title: 'Markdown website builder',
    description:
      'Frontend pages from markdown, YAML frontmatter, and a bit of CSS, compressed into the URL. Share a link and the page renders — no accounts, no backend. The editor shows a live preview, and optional AI edits for an element or the whole page go through a Cloudflare Worker so the OpenAI key never reaches the browser.',
    live_url: 'https://markdown-website-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/markdown-website-builder',
    image: 'markdown-website-builder',
    imageWidth: 1920,
    imageHeight: 980,
    alt: 'Markdown website builder with source on the left and a live preview of Field Notes on the right',
    skills: ['React', 'TypeScript', 'Cloudflare', 'OpenAI'],
  },
  {
    title: 'URL shortener',
    description:
      'Rails redirect service with webhook-backed click counts. The interesting bit was keeping the hop itself cheap.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/url_shortener',
    image: 'url-shortener',
    imageWidth: 1024,
    imageHeight: 541,
    alt: 'URL shortener turning a long link into a short localhost address',
    skills: ['Ruby on Rails'],
  },
  {
    title: 'Link in bio',
    description:
      'Link in bio app with an editable bio page. The app uses Hotwire/StimulusJS to update the bio page in real time. Links are orderable to prioritize the most important links. Images live on Cloudflare R2.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/RoR-link_in_bio',
    image: 'linkinbio',
    imageWidth: 1024,
    imageHeight: 524,
    alt: 'LinkFlow homepage with the line “One page for every link you share.”',
    skills: ['Ruby on Rails', 'Hotwire', 'Cloudflare R2'],
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
    alt: 'This portfolio’s introduction on a star field',
    skills: ['Astro', 'TypeScript'],
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
    alt: 'Fake API page with a request form beside a sample JSON response',
    skills: ['Sinatra', 'OpenAI'],
  },
  {
    title: 'Planedle',
    description:
      'A daily guess-the-aircraft game. You see a zoomed-in photo of a plane and each wrong guess zooms out, over six tries. Photos load from Wikimedia Commons.',
    live_url: 'https://maysentg.github.io/planedle/',
    github_repo: 'https://github.com/MaysenTG/planedle',
    image: 'planedle',
    imageWidth: 1024,
    imageHeight: 552,
    imagePosition: 'center',
    alt: 'Planedle showing a tight crop of an aircraft tail marked N144',
    skills: ['JavaScript', 'Vite'],
  },
]

export const projectImageWidths = [400, 800, 1200] as const
export const heroImageWidths = [640, 960, 1280, 1600] as const
