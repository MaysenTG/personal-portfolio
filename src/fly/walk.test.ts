import { describe, expect, it } from 'vitest'
import { pushOutOfCircles, stepWalk, type WalkState } from './walk'

const bounds = { x: 0, z: 0, radius: 10 }

describe('stepWalk', () => {
  it('stops at the shore', () => {
    let state: WalkState = { x: 0, z: 0, yaw: 0 }
    for (let i = 0; i < 120; i++) state = stepWalk(state, { x: 1, z: 0 }, 1 / 60, bounds)
    expect(Math.hypot(state.x, state.z)).toBeLessThanOrEqual(bounds.radius - 1.35 + 0.001)
    expect(state.x).toBeGreaterThan(5)
  })

  it('faces the way it is walking', () => {
    const next = stepWalk({ x: 0, z: 0, yaw: 0 }, { x: 0, z: -1 }, 1 / 60, bounds)
    expect(next.yaw).toBeCloseTo(0, 5)
    expect(next.z).toBeLessThan(0)
  })

  it('slides out of a solid circle', () => {
    const next = stepWalk({ x: -1, z: 0, yaw: 0 }, { x: 1, z: 0 }, 1 / 30, bounds, [
      { x: 0, z: 0, radius: 1.2 },
    ])
    expect(Math.hypot(next.x, next.z)).toBeGreaterThanOrEqual(1.2 - 0.001)
  })
})

describe('pushOutOfCircles', () => {
  it('leaves a point that is already outside', () => {
    expect(pushOutOfCircles(5, 0, [{ x: 0, z: 0, radius: 1 }])).toEqual({ x: 5, z: 0 })
  })
})
