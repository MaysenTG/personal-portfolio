/** Semantic groupings for the projects page filters. */
export const projectCategories = [
  'Dev tools',
  'Web apps',
  'Data',
  'Fitness',
  'Games',
] as const

export type ProjectCategory = (typeof projectCategories)[number]

export type Project = {
  title: string
  description: string
  live_url: string
  github_repo: string
  /** Basename under /assets/images/{name}-{width}.{avif,webp}. Omit to use the placeholder. */
  image?: string
  imageWidth?: number
  imageHeight?: number
  /** object-position for the cropped screenshot */
  imagePosition?: string
  alt?: string
  skills: readonly string[]
  /** What kind of project this is — used for semantic filters on /projects. */
  categories: readonly ProjectCategory[]
  featured?: boolean
  /** Shown on the homepage project strip (featured projects always are). */
  showOnHome?: boolean
}

export const DEFAULT_PROJECT_IMAGE = {
  image: 'project-placeholder',
  imageWidth: 1200,
  imageHeight: 675,
} as const

export type ResolvedProjectImage = {
  image: string
  imageWidth: number
  imageHeight: number
  alt: string
  imagePosition?: string
}

export function resolveProjectImage(project: Project): ResolvedProjectImage {
  if (project.image) {
    return {
      image: project.image,
      imageWidth: project.imageWidth ?? DEFAULT_PROJECT_IMAGE.imageWidth,
      imageHeight: project.imageHeight ?? DEFAULT_PROJECT_IMAGE.imageHeight,
      alt: project.alt ?? `${project.title} screenshot`,
      imagePosition: project.imagePosition,
    }
  }

  return {
    image: DEFAULT_PROJECT_IMAGE.image,
    imageWidth: DEFAULT_PROJECT_IMAGE.imageWidth,
    imageHeight: DEFAULT_PROJECT_IMAGE.imageHeight,
    alt: project.alt ?? `${project.title} — screenshot coming soon`,
  }
}

/** Featured first, then other homepage picks, preserving data-file order within each group. */
export function getHomepageProjects(all: readonly Project[] = projects): Project[] {
  const featured = all.filter((project) => project.featured)
  const rest = all.filter((project) => !project.featured && project.showOnHome)
  return [...featured, ...rest]
}

export function slugifyFilterValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Unique skills across projects, most-used first, then A–Z. */
export function getProjectSkills(all: readonly Project[] = projects): string[] {
  const counts = new Map<string, number>()
  for (const project of all) {
    for (const skill of project.skills) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([skill]) => skill)
}

/** Categories that actually appear on at least one project, in display order. */
export function getUsedProjectCategories(
  all: readonly Project[] = projects,
): ProjectCategory[] {
  const used = new Set(all.flatMap((project) => project.categories))
  return projectCategories.filter((category) => used.has(category))
}

export const projects: Project[] = [
  {
    title: 'Static site creator',
    description:
      'A Rails app for creating and hosting static sites, with an editor in the browser for changing the files.',
    live_url: 'https://static-site-creator.fly.dev',
    github_repo: 'https://github.com/MaysenTG/ror-gcs-site-creator',
    image: 'static-site-generator',
    imageWidth: 1024,
    imageHeight: 511,
    alt: 'Gusto Cloud editor open on the HTML for a site called maysens-website',
    skills: ['Ruby on Rails', 'Hotwire', 'Cloudflare R2'],
    categories: ['Web apps'],
    featured: true,
  },
  {
    title: 'ZWO Builder',
    description:
      'A Zwift workout editor where you drag blocks to build intervals or describe changes in plain English, then export the workout as a .zwo file.',
    live_url: 'https://zwo-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/zwift-workout-creator',
    image: 'zwift-workout-builder',
    imageWidth: 1919,
    imageHeight: 875,
    alt: 'ZWO Builder editing a sweet spot workout, with the power profile in the centre',
    skills: ['React', 'TypeScript', 'Cloudflare', 'OpenAI'],
    categories: ['Fitness'],
    featured: true,
  },
  {
    title: 'Who Funds NZ',
    description:
      'An unofficial explorer of large donations to New Zealand political parties. Filter by party, year, amount, and donor type, then export the results as CSV.',
    live_url: 'https://whofunds.nz',
    github_repo: 'https://github.com/MaysenTG/nz-party-donations-explorer',
    image: 'whofunds',
    imageWidth: 1024,
    imageHeight: 564,
    alt: 'Who Funds NZ showing amount-by-party bars, with National, ACT, Conservative and Labour leading the filtered totals',
    skills: ['React', 'TypeScript', 'Vite', 'Recharts'],
    categories: ['Data'],
    showOnHome: true,
  },
  {
    title: 'CronClock',
    description:
      'Paste a cron expression to see what it means and when it next runs, in as many time zones as you need.',
    live_url: 'https://cronclock.pages.dev',
    github_repo: 'https://github.com/MaysenTG/cronclock',
    image: 'cronclock',
    imageWidth: 1024,
    imageHeight: 571,
    alt: 'CronClock explaining 0 9 20 * * as 9:00 AM on day 20 of every month, with Auckland and UTC next runs',
    skills: ['TypeScript', 'Vite', 'Cloudflare'],
    categories: ['Dev tools'],
    showOnHome: true,
  },
  {
    title: 'PasteTable',
    description:
      'Turn pasted JSON, CSV, TSV, or psql output into a table that you can sort, filter, copy, or share as a link.',
    live_url: 'https://pastetable.pages.dev',
    github_repo: 'https://github.com/MaysenTG/pastetable',
    image: 'pastetable',
    imageWidth: 1024,
    imageHeight: 556,
    alt: 'PasteTable with JSON of people on the left and a sortable name, location and title table below',
    skills: ['TypeScript', 'Vite', 'Cloudflare'],
    categories: ['Dev tools'],
    showOnHome: true,
  },
  {
    title: 'CurlCard',
    description:
      'Paste a curl command to get a readable breakdown of the request. Edit any field and the command updates, or copy the same request as fetch, Ruby, or HTTPie.',
    live_url: 'https://curlcard.pages.dev',
    github_repo: 'https://github.com/MaysenTG/curlcard',
    image: 'curlcard',
    imageWidth: 1024,
    imageHeight: 563,
    alt: 'CurlCard with a pasted curl command above and editable method, URL, and query fields below',
    skills: ['TypeScript', 'Vite', 'Cloudflare'],
    categories: ['Dev tools'],
    showOnHome: true,
  },
  {
    title: 'Markdown website builder',
    description:
      'Write a page in Markdown and share it as a link. The editor shows a live preview, and optional AI edits can change one element or the whole page.',
    live_url: 'https://markdown-website-builder.pages.dev/',
    github_repo: 'https://github.com/MaysenTG/markdown-website-builder',
    image: 'markdown-website-builder',
    imageWidth: 1920,
    imageHeight: 980,
    alt: 'Markdown website builder with source on the left and a live preview of Field Notes on the right',
    skills: ['React', 'TypeScript', 'Cloudflare', 'OpenAI'],
    categories: ['Web apps'],
  },
  {
    title: 'URL shortener',
    description:
      'A Rails app that turns long URLs into short links and counts the clicks on each one.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/url_shortener',
    image: 'url-shortener',
    imageWidth: 1024,
    imageHeight: 541,
    alt: 'URL shortener turning a long link into a short localhost address',
    skills: ['Ruby on Rails'],
    categories: ['Dev tools', 'Web apps'],
  },
  {
    title: 'Link in bio',
    description:
      'A Rails app for a link-in-bio page, where you add and reorder links and see the page update in real time.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/RoR-link_in_bio',
    image: 'linkinbio',
    imageWidth: 1024,
    imageHeight: 524,
    alt: 'LinkFlow homepage with the line “One page for every link you share.”',
    skills: ['Ruby on Rails', 'Hotwire', 'Cloudflare R2'],
    categories: ['Web apps'],
  },
  {
    title: 'This site',
    description:
      'My personal site, built with Astro and very little JavaScript.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/personal-portfolio',
    image: 'personal-portfolio',
    imageWidth: 1919,
    imageHeight: 854,
    alt: 'This portfolio’s introduction on a star field',
    skills: ['Astro', 'TypeScript'],
    categories: ['Web apps'],
  },
  {
    title: 'Fake API',
    description:
      'A Sinatra app that creates REST endpoints for testing, with response data written by OpenAI.',
    live_url: '',
    github_repo: 'https://github.com/MaysenTG/fake-api',
    image: 'fake-api',
    imageWidth: 3018,
    imageHeight: 1524,
    alt: 'Fake API page with a request form beside a sample JSON response',
    skills: ['Sinatra', 'OpenAI'],
    categories: ['Dev tools'],
  },
  {
    title: 'Planedle',
    description:
      'A daily guess-the-aircraft game where each wrong guess shows more of the photo, and you have six tries to get it.',
    live_url: 'https://maysentg.github.io/planedle/',
    github_repo: 'https://github.com/MaysenTG/planedle',
    image: 'planedle',
    imageWidth: 1024,
    imageHeight: 552,
    imagePosition: 'center',
    alt: 'Planedle showing a tight crop of an aircraft tail marked N144',
    skills: ['JavaScript', 'Vite'],
    categories: ['Games'],
  },
]

export const projectImageWidths = [400, 800, 1200] as const
export const heroImageWidths = [640, 960, 1280, 1600] as const
