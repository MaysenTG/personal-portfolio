import { projects, type Project } from '../data/projects'
import { aboutCopy, contactIntro, profile, skillGroups } from '../data/site'
import { ISLANDS, type IslandId } from './islands'

export type IslandContent =
  | { id: 'projects'; title: string; projects: readonly Project[] }
  | {
      id: 'about'
      title: string
      statement: string
      body: string
      facts: typeof aboutCopy.facts
    }
  | { id: 'skills'; title: string; groups: typeof skillGroups }
  | {
      id: 'contact'
      title: string
      intro: string
      email: string
      github: string
      linkedin: string
    }

export function getIslandContent(id: IslandId): IslandContent {
  switch (id) {
    case 'projects':
      return { id, title: 'Projects', projects }
    case 'about':
      return {
        id,
        title: 'About',
        statement: aboutCopy.statement,
        body: aboutCopy.body,
        facts: aboutCopy.facts,
      }
    case 'skills':
      return { id, title: 'Skills', groups: skillGroups }
    case 'contact':
      return {
        id,
        title: 'Contact',
        intro: contactIntro,
        email: profile.email,
        github: profile.github,
        linkedin: profile.linkedin,
      }
  }
}

export function listIslandContent(): IslandContent[] {
  return ISLANDS.map((island) => getIslandContent(island.id))
}
