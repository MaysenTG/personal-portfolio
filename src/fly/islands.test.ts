import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ISLANDS,
  SURFACE_Y,
  WATER_FLOOR,
  flightFloor,
  nearestPad,
  spawnPoint,
  yawToward,
} from './islands'

describe('island layout', () => {
  it('keeps every island on its own patch of water', () => {
    for (const island of ISLANDS) {
      for (const other of ISLANDS) {
        if (other.id === island.id) continue
        const gap = Math.hypot(island.x - other.x, island.z - other.z) - island.radius - other.radius
        expect(gap).toBeGreaterThan(40)
      }
    }
  })

  it('raises the floor to the grass at the pad and leaves open water low', () => {
    expect(flightFloor(0, 0)).toBe(WATER_FLOOR)
    for (const island of ISLANDS) {
      expect(flightFloor(island.x, island.z)).toBeCloseTo(SURFACE_Y, 5)
      expect(flightFloor(island.padX, island.padZ)).toBeCloseTo(island.padY, 5)
      const outside = flightFloor(island.x + island.radius + 5, island.z)
      expect(outside).toBe(WATER_FLOOR)
    }
  })

  it('spawns the walker on grass, clear of the helicopter, short of the sign', () => {
    for (const island of ISLANDS) {
      const spawn = spawnPoint(island)
      expect(Math.hypot(spawn.x - island.x, spawn.z - island.z)).toBeLessThan(island.radius - 1.35)
      const fromPad = Math.hypot(spawn.x - island.padX, spawn.z - island.padZ)
      expect(fromPad).toBeGreaterThan(2)
      const toKiosk = Math.hypot(spawn.x - island.kioskX, spawn.z - island.kioskZ)
      expect(toKiosk).toBeGreaterThan(2)
      expect(toKiosk).toBeLessThan(18)
      const nearest = nearestPad(spawn.x, spawn.z)
      expect(nearest.island.id).toBe(island.id)
    }
  })

  it('points takeoff facing toward the sign', () => {
    for (const island of ISLANDS) {
      const yaw = yawToward(island.padX, island.padZ, island.kioskX, island.kioskZ)
      const dx = island.kioskX - island.padX
      const dz = island.kioskZ - island.padZ
      const length = Math.hypot(dx, dz)
      const forwardX = Math.sin(yaw)
      const forwardZ = -Math.cos(yaw)
      expect((forwardX * dx + forwardZ * dz) / length).toBeGreaterThan(0.99)
    }
  })
})

describe('shared section copy', () => {
  it('keeps the about text in the data file rather than the component', () => {
    const about = readFileSync(new URL('../components/About.astro', import.meta.url), 'utf8')
    expect(about).toContain('aboutCopy')
    expect(about).not.toContain('Intermediate Developer')
  })
})
