import { describe, expect, it } from 'vitest'
import { canLand, landingChecks, type LandingSample } from './landing'

function sample(overrides: Partial<LandingSample> = {}): LandingSample {
  return {
    position: { x: 0, y: 3.15, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 0,
    roll: 0,
    pad: { x: 0, y: 3.15, z: 0, radius: 6 },
    ...overrides,
  }
}

describe('canLand', () => {
  it('accepts a slow, level touchdown on the pad', () => {
    expect(canLand(sample())).toBe(true)
    expect(landingChecks(sample())).toEqual({
      overPad: true,
      slow: true,
      level: true,
      low: true,
    })
  })

  it('rejects a fast approach', () => {
    const checks = landingChecks(sample({ velocity: { x: 9, y: 0, z: 0 } }))
    expect(checks.slow).toBe(false)
    expect(canLand(sample({ velocity: { x: 9, y: 0, z: 0 } }))).toBe(false)
  })

  it('rejects a steep descent', () => {
    expect(canLand(sample({ velocity: { x: 0, y: -5, z: 0 } }))).toBe(false)
  })

  it('rejects a tilted aircraft', () => {
    expect(canLand(sample({ pitch: 0.4, roll: 0 }))).toBe(false)
    expect(canLand(sample({ pitch: 0, roll: -0.4 }))).toBe(false)
  })

  it('rejects being off the pad or too high', () => {
    expect(canLand(sample({ position: { x: 8, y: 3.15, z: 0 } }))).toBe(false)
    expect(canLand(sample({ position: { x: 0, y: 8, z: 0 } }))).toBe(false)
  })
})
