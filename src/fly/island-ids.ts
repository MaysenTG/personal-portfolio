export const ISLAND_IDS = ['projects', 'about', 'skills', 'contact'] as const

export type IslandId = (typeof ISLAND_IDS)[number]

export function isIslandId(value: string | undefined): value is IslandId {
  return ISLAND_IDS.some((id) => id === value)
}
