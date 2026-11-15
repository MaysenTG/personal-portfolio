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
  it('hovers when thrust is neutral', () => {
    const next = settle(createFlightState({ y: 10 }), NEUTRAL_PILOT, 2)
    expect(next.y).toBeCloseTo(10, 5)
    expect(next.vy).toBe(0)
  })

  it('climbs and descends with climb input', () => {
    const up = settle(createFlightState({ y: 10 }), { ...NEUTRAL_PILOT, climb: 1 }, 1)
    const down = settle(createFlightState({ y: 10 }), { ...NEUTRAL_PILOT, climb: -1 }, 1)
    expect(up.y).toBeGreaterThan(12)
    expect(down.y).toBeLessThan(8)
  })

  it('flies forward along facing and leans the nose for juice', () => {
    const next = settle(createFlightState({ yaw: 0 }), { ...NEUTRAL_PILOT, forward: 1 }, 1)
    expect(next.z).toBeLessThan(-5)
    expect(next.vz).toBeLessThan(0)
    expect(next.pitch).toBeGreaterThan(0.1)
    expect(next.pitch).toBeLessThanOrEqual(FLIGHT.maxPitch + 1e-6)
  })

  it('turns right and banks, aiming the nose the way the camera should face', () => {
    const next = settle(createFlightState(), { ...NEUTRAL_PILOT, turn: 1 }, 0.8)
    expect(next.yaw).toBeGreaterThan(0.8)
    expect(next.roll).toBeLessThan(-0.1)
  })

  it('moves along a new heading after turning', () => {
    let state = createFlightState()
    state = settle(state, { ...NEUTRAL_PILOT, turn: 1 }, 0.7)
    const afterTurn = state.yaw
    state = settle(state, { ...NEUTRAL_PILOT, forward: 1 }, 0.8)
    const facingX = Math.sin(afterTurn)
    const facingZ = -Math.cos(afterTurn)
    const along = state.vx * facingX + state.vz * facingZ
    expect(along).toBeGreaterThan(5)
  })

  it('levels out when you stop thrusting and turning', () => {
    const moving = settle(createFlightState(), { ...NEUTRAL_PILOT, forward: 1, turn: 1 }, 1)
    const level = settle(moving, NEUTRAL_PILOT, 1.5)
    expect(Math.abs(level.pitch)).toBeLessThan(0.05)
    expect(Math.abs(level.roll)).toBeLessThan(0.05)
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
