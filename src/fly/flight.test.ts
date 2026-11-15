import { describe, expect, it } from 'vitest'
import {
  FLIGHT,
  NEUTRAL_PILOT,
  PLAY_RADIUS,
  applyFloor,
  containFlight,
  createFlightState,
  stepFlight,
} from './flight'

function settle(state: ReturnType<typeof createFlightState>, input: typeof NEUTRAL_PILOT, seconds: number) {
  let next = state
  const steps = Math.round(seconds / (1 / 60))
  for (let i = 0; i < steps; i++) next = stepFlight(next, input, 1 / 60)
  return next
}

describe('stepFlight', () => {
  it('hovers when the collective is neutral', () => {
    const next = settle(createFlightState({ y: 10 }), NEUTRAL_PILOT, 2)
    expect(next.y).toBeCloseTo(10, 5)
    expect(next.vy).toBe(0)
  })

  it('climbs with positive collective and descends with negative', () => {
    const up = settle(createFlightState({ y: 10 }), { ...NEUTRAL_PILOT, collective: 1 }, 1)
    const down = settle(createFlightState({ y: 10 }), { ...NEUTRAL_PILOT, collective: -1 }, 1)
    expect(up.y).toBeGreaterThan(12)
    expect(down.y).toBeLessThan(8)
  })

  it('tilts forward and accelerates along -Z, then levels when the stick is released', () => {
    const tilted = settle(createFlightState(), { ...NEUTRAL_PILOT, cyclicPitch: 1 }, 1.2)
    expect(tilted.pitch).toBeGreaterThan(0.25)
    expect(tilted.pitch).toBeLessThanOrEqual(FLIGHT.maxTilt + 1e-6)
    expect(tilted.z).toBeLessThan(-1)
    expect(tilted.vz).toBeLessThan(0)

    const level = settle(tilted, NEUTRAL_PILOT, 2)
    expect(Math.abs(level.pitch)).toBeLessThan(0.02)
  })

  it('banks right and accelerates along +X', () => {
    const next = settle(createFlightState(), { ...NEUTRAL_PILOT, cyclicRoll: 1 }, 1)
    expect(next.roll).toBeGreaterThan(0.2)
    expect(next.x).toBeGreaterThan(1)
  })

  it('yaws to the right with pedal input', () => {
    const next = settle(createFlightState(), { ...NEUTRAL_PILOT, yaw: 1 }, 0.8)
    expect(next.yaw).toBeGreaterThan(0.2)
  })
})

describe('containFlight and applyFloor', () => {
  it('pulls a far aircraft back inside the play radius', () => {
    const next = containFlight(createFlightState({ x: 800, z: 0, vx: 20 }))
    expect(Math.hypot(next.x, next.z)).toBeCloseTo(PLAY_RADIUS, 5)
    expect(next.vx).toBeLessThan(20)
  })

  it('reports the impact speed and rests on the floor', () => {
    const { state, verticalSpeed } = applyFloor(createFlightState({ y: 1, vy: -6 }), 3.15)
    expect(verticalSpeed).toBe(-6)
    expect(state.y).toBe(3.15)
    expect(state.vy).toBe(0)
  })

  it('leaves an aircraft that is already above the floor', () => {
    const start = createFlightState({ y: 8, vy: -1 })
    const { state, verticalSpeed } = applyFloor(start, 3)
    expect(state).toBe(start)
    expect(verticalSpeed).toBe(-1)
  })
})
