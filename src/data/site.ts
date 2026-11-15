/** Copy shared by the About section and the island explorer. */
export const aboutCopy = {
  statement: 'Outside of work, I’m a triathlete and a helicopter pilot.',
  body: 'At Henry Schein One, I work on Dentally, where I lead large projects, improve the developer experience, and mentor junior developers.',
  facts: [
    { label: 'Role', value: 'Intermediate Developer, Henry Schein One' },
    { label: 'Main tools', value: 'Ruby on Rails, Ember, ASP.NET' },
    { label: 'Outside work', value: 'Triathlon, helicopters' },
  ],
} as const

/** Lead sentence shared by the contact section and the island explorer. */
export const contactIntro =
  'Email me about a role, a project, or a ride, or send a message with the form.'

export const profile = {
  name: 'Maysen Greenwood',
  email: 'greenwood.maysen@gmail.com',
  github: 'https://github.com/MaysenTG',
  linkedin: 'https://www.linkedin.com/in/maysen-greenwood/',
  description:
    'Software developer in New Zealand, working on Dentally at Henry Schein One with Rails and Ember. I also build side projects such as Who Funds NZ and ZWO Builder.',
} as const

export const skillGroups = [
  {
    title: 'Languages and frameworks',
    items: ['Ruby on Rails', 'Ember', 'ASP.NET', 'React', 'TypeScript', 'Hotwire'],
  },
  {
    title: 'Tools and services',
    items: ['PostgreSQL', 'Stripe', 'Cloudflare'],
  },
  {
    title: 'Work practices',
    items: ['Mentoring junior developers', 'Optimising database queries', 'Writing documentation'],
  },
] as const

export const emailJs = {
  service_id: 'service_wjf5wfb',
  template_id: 'template_olzhave',
  user_id: 'SVd0-2wmTIqt3Yvlz',
} as const
