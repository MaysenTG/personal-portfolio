import { ISLAND_IDS, isIslandId, type IslandId } from './island-ids'

export type { IslandId }
export { ISLAND_IDS, isIslandId }

export type IslandDef = {
  id: IslandId
  label: string
  x: number
  z: number
  radius: number
  surfaceY: number
  grass: number
  trees: number
  rocks: number
  padX: number
  padZ: number
  padY: number
  padRadius: number
  kioskX: number
  kioskZ: number
  kioskRadius: number
}

/** Grass top, in world units. Water sits at y = 0. */
export const SURFACE_Y = 3.15

/** Lowest the skids can fly when they are over open water. */
export const WATER_FLOOR = 1.85

const SHORE_RAMP = 8

const SPECS = [
  { id: 'projects', label: 'Projects', x: 0, z: -132, radius: 36, grass: 0x3d8c48, trees: 12, rocks: 4 },
  { id: 'about', label: 'About', x: 136, z: 18, radius: 28, grass: 0x4c9a55, trees: 8, rocks: 3 },
  { id: 'skills', label: 'Skills', x: -16, z: 136, radius: 30, grass: 0x2f7844, trees: 9, rocks: 3 },
  { id: 'contact', label: 'Contact', x: -134, z: -20, radius: 26, grass: 0x63a85a, trees: 7, rocks: 2 },
] as const satisfies readonly {
  id: IslandId
  label: string
  x: number
  z: number
  radius: number
  grass: number
  trees: number
  rocks: number
}[]

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

function buildIsland(spec: (typeof SPECS)[number]): IslandDef {
  const length = Math.hypot(spec.x, spec.z) || 1
  const towardOriginX = -spec.x / length
  const towardOriginZ = -spec.z / length
  const padReach = spec.radius * 0.52
  const kioskReach = spec.radius * 0.06
  return {
    id: spec.id,
    label: spec.label,
    x: spec.x,
    z: spec.z,
    radius: spec.radius,
    surfaceY: SURFACE_Y,
    grass: spec.grass,
    trees: spec.trees,
    rocks: spec.rocks,
    padX: spec.x + towardOriginX * padReach,
    padZ: spec.z + towardOriginZ * padReach,
    padY: SURFACE_Y,
    padRadius: 6.2,
    kioskX: spec.x + towardOriginX * kioskReach,
    kioskZ: spec.z + towardOriginZ * kioskReach,
    kioskRadius: 4.5,
  }
}

export const ISLANDS: readonly IslandDef[] = SPECS.map(buildIsland)

export function islandById(id: IslandId): IslandDef {
  const island = ISLANDS.find((item) => item.id === id)
  if (!island) throw new Error(`Unknown island ${id}`)
  return island
}

/** Yaw whose forward axis (-Z at 0) points from one point toward another. */
export function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, -(toZ - fromZ))
}

/** A few steps off the pad, toward the sign, still on the grass. */
export function spawnPoint(island: IslandDef): { x: number; z: number } {
  const dx = island.kioskX - island.padX
  const dz = island.kioskZ - island.padZ
  const length = Math.hypot(dx, dz) || 1
  return {
    x: island.padX + (dx / length) * 3.6,
    z: island.padZ + (dz / length) * 3.6,
  }
}

export function nearestPad(
  x: number,
  z: number,
  islands: readonly IslandDef[] = ISLANDS,
): { island: IslandDef; distance: number } {
  const first = islands[0]
  if (!first) throw new Error('No islands')
  let best = first
  let bestDistance = Math.hypot(x - first.padX, z - first.padZ)
  for (const island of islands.slice(1)) {
    const distance = Math.hypot(x - island.padX, z - island.padZ)
    if (distance < bestDistance) {
      best = island
      bestDistance = distance
    }
  }
  return { island: best, distance: bestDistance }
}

/**
 * Skid altitude for a point. Over an island the floor rises from the water
 * up to the grass so the aircraft eases onto the shore instead of popping.
 */
export function flightFloor(x: number, z: number, islands: readonly IslandDef[] = ISLANDS): number {
  let floor = WATER_FLOOR
  for (const island of islands) {
    const distance = Math.hypot(x - island.x, z - island.z)
    if (distance >= island.radius) continue
    const inner = island.radius - SHORE_RAMP
    const blend = distance <= inner ? 1 : 1 - (distance - inner) / SHORE_RAMP
    const height = WATER_FLOOR + (island.surfaceY - WATER_FLOOR) * smoothstep(blend)
    if (height > floor) floor = height
  }
  return floor
}
