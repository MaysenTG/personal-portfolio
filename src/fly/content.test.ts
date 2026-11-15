import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { projects } from '../data/projects'
import { aboutCopy, contactIntro, profile, skillGroups } from '../data/site'
import { ISLANDS } from './islands'
import { getIslandContent, listIslandContent } from './content'

describe('island content', () => {
  it('maps the four portfolio sections in island order', () => {
    expect(listIslandContent().map((island) => island.id)).toEqual(ISLANDS.map((island) => island.id))
    expect(listIslandContent().map((island) => island.title)).toEqual([
      'Projects',
      'About',
      'Skills',
      'Contact',
    ])
  })

  it('lists every project from the data file', () => {
    const content = getIslandContent('projects')
    expect(content.id).toBe('projects')
    if (content.id !== 'projects') return
    expect(content.projects.map((project) => project.title)).toEqual(projects.map((project) => project.title))
    expect(content.projects).toBe(projects)
  })

  it('uses the shared about copy, including the role line', () => {
    expect(aboutCopy.statement).toBe('Outside of work, I\u2019m a triathlete and a helicopter pilot.')
    expect(aboutCopy.body).toBe(
      'At Henry Schein One, I work on Dentally, where I lead large projects, improve the developer experience, and mentor junior developers.',
    )
    expect(aboutCopy.facts).toEqual([
      { label: 'Role', value: 'Intermediate Developer, Henry Schein One' },
      { label: 'Main tools', value: 'Ruby on Rails, Ember, ASP.NET' },
      { label: 'Outside work', value: 'Triathlon, helicopters' },
    ])
    const content = getIslandContent('about')
    expect(content.id).toBe('about')
    if (content.id !== 'about') return
    expect(content.statement).toBe(aboutCopy.statement)
    expect(content.body).toBe(aboutCopy.body)
    expect(content.facts).toBe(aboutCopy.facts)
  })

  it('uses the skill groups from site data', () => {
    const content = getIslandContent('skills')
    expect(content.id).toBe('skills')
    if (content.id !== 'skills') return
    expect(content.groups).toBe(skillGroups)
  })

  it('uses the contact intro and profile links', () => {
    expect(contactIntro).toBe(
      'Email me about a role, a project, or a ride, or send a message with the form.',
    )
    const content = getIslandContent('contact')
    expect(content.id).toBe('contact')
    if (content.id !== 'contact') return
    expect(content.intro).toBe(contactIntro)
    expect(content.email).toBe(profile.email)
    expect(content.github).toBe(profile.github)
    expect(content.linkedin).toBe(profile.linkedin)
  })

  it('renders the fly page from that mapping', () => {
    const page = readFileSync(new URL('../pages/fly/index.astro', import.meta.url), 'utf8')
    expect(page).toContain('listIslandContent')
    expect(page).not.toContain('Intermediate Developer')
    expect(page).not.toContain('fly-3d-bundle')
  })
})
