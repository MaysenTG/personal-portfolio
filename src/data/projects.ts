export type Project = {
  title: string
  description: string
  live_url: string
  github_repo: string
  image_url: string
  skills: string
  featured?: boolean
}

export const projects: Project[] = [
  {
    title: 'ZWO Builder',
    description:
      'A Zwift workout editor I built because clicking intervals together in-game is slow. Drag blocks around, describe a change in plain English, export a .zwo. Workouts stay on the the browser in IndexedDB.',
    live_url: 'https://zwo-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/zwift-workout-creator',
    image_url: '/assets/images/zwift-workout-builder.png',
    skills: 'React, TypeScript, Cloudflare, OpenAI',
    featured: true,
  },
  {
    title: 'URL shortener',
    description:
      'Rails redirect service with webhook-backed click counts. The interesting bit was keeping the hop itself cheap.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/url_shortener',
    image_url: '/assets/images/url-shortener.webp',
    skills: 'Ruby on Rails',
  },
  {
    title: 'Online store',
    description:
      'Rails shop with an admin area for products, categories, and orders. Checkout runs through Stripe.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/RoR-online_store',
    image_url: '/assets/images/online-store.webp',
    skills: 'Ruby on Rails, Stripe',
  },
  {
    title: 'Static site generator',
    description:
      'Drop files into Google Cloud Storage and the published site updates. Content changes skip a full redeploy.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/ror-gcs-site-creator',
    image_url: '/assets/images/static-site-generator.webp',
    skills: 'Ruby on Rails, Hotwire, Google Cloud Storage',
  },
  {
    title: 'Link in bio',
    description:
      'Link in bio app with an editable bio page. The app uses Hotwire/StimulusJS to update the bio page in real time. Links are orderable to prioritize the most important links.',
    live_url: 'https://linkinbio.fly.dev/',
    github_repo: 'https://github.com/MaysenTG/RoR-link_in_bio',
    image_url: '/assets/images/linkinbio.webp',
    skills: 'Ruby on Rails, Hotwire/StimulusJS, Cloudflare R2 asset storage',
  },
  {
    title: 'This site',
    description:
      'Personal site in Astro with a cache-first service worker. The project list is a JS file on purpose — adding something new should not involve a CMS.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/personal-portfolio',
    image_url: '/assets/images/personal-portfolio.webp',
    skills: 'Astro, Service Worker',
  },
  {
    title: 'Fake API',
    description:
      'Sinatra app that stands up REST endpoints for testing. OpenAI fills in the responses, then they get cached so you are not paying for the same fake payload twice.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/fake-api',
    image_url: '/assets/images/fake-api.webp',
    skills:
      'Sinatra (Ruby), RESTful APIs, JSON formatted responses from OpenAI, agressive caching',
  },
]
