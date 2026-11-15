export type FlightState = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  pitch: number
  roll: number
  yawRate: number
}

export type PilotInput = {
  /** -1 descend, 0 hover, +1 climb. There is no gravity in this arcade model. */
  collective: number
  /** -1 left, +1 right. */
  yaw: number
  /** -1 back, +1 nose down (forward). */
  cyclicPitch: number
  /** -1 left, +1 right. */
  cyclicRoll: number
}

export const FLIGHT = {
  collectiveAccel: 16,
  verticalDrag: 1.5,
  yawAccel: 2.5,
  yawDrag: 3,
  maxTilt: 0.42,
  tiltResponse: 4.2,
  levelResponse: 2.6,
  tiltAccel: 38,
  horizontalDrag: 0.72,
  maxHeight: 56,
} as const

export const PLAY_RADIUS = 420

export const NEUTRAL_PILOT: PilotInput = {
  collective: 0,
  yaw: 0,
  cyclicPitch: 0,
  cyclicRoll: 0,
}

export function createFlightState(overrides: Partial<FlightState> = {}): FlightState {
  return {
    x: 0,
    y: 10,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    yawRate: 0,
    ...overrides,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}

/**
 * One arcade step. Yaw 0 faces -Z. Positive pitch is nose-down and accelerates
 * forward. Positive roll banks right and accelerates to the right. Releasing
 * the cyclic returns pitch and roll toward level.
 */
export function stepFlight(state: FlightState, input: PilotInput, dt: number): FlightState {
  const step = clamp(dt, 0, 0.05)
  if (step === 0) return state

  const cyclicPitch = clamp(input.cyclicPitch, -1, 1)
  const cyclicRoll = clamp(input.cyclicRoll, -1, 1)
  const pitch = approach(
    state.pitch,
    cyclicPitch * FLIGHT.maxTilt,
    cyclicPitch === 0 ? FLIGHT.levelResponse : FLIGHT.tiltResponse,
    step,
  )
  const roll = approach(
    state.roll,
    cyclicRoll * FLIGHT.maxTilt,
    cyclicRoll === 0 ? FLIGHT.levelResponse : FLIGHT.tiltResponse,
    step,
  )

  let yawRate = state.yawRate + clamp(input.yaw, -1, 1) * FLIGHT.yawAccel * step
  yawRate *= Math.exp(-FLIGHT.yawDrag * step)
  if (Math.abs(yawRate) < 0.0001) yawRate = 0
  const yaw = state.yaw + yawRate * step

  const sinYaw = Math.sin(yaw)
  const cosYaw = Math.cos(yaw)
  const forwardX = sinYaw
  const forwardZ = -cosYaw
  const rightX = cosYaw
  const rightZ = sinYaw
  const ax = (Math.sin(pitch) * forwardX + Math.sin(roll) * rightX) * FLIGHT.tiltAccel
  const az = (Math.sin(pitch) * forwardZ + Math.sin(roll) * rightZ) * FLIGHT.tiltAccel
  const ay = clamp(input.collective, -1, 1) * FLIGHT.collectiveAccel

  const horizontalDrag = Math.exp(-FLIGHT.horizontalDrag * step)
  const verticalDrag = Math.exp(-FLIGHT.verticalDrag * step)
  let vx = (state.vx + ax * step) * horizontalDrag
  let vz = (state.vz + az * step) * horizontalDrag
  let vy = (state.vy + ay * step) * verticalDrag
  if (Math.abs(vx) < 0.0001) vx = 0
  if (Math.abs(vy) < 0.0001) vy = 0
  if (Math.abs(vz) < 0.0001) vz = 0

  let y = state.y + vy * step
  if (y > FLIGHT.maxHeight) {
    y = FLIGHT.maxHeight
    if (vy > 0) vy = 0
  }

  return {
    x: state.x + vx * step,
    y,
    z: state.z + vz * step,
    vx,
    vy,
    vz,
    yaw,
    pitch,
    roll,
    yawRate,
  }
}

/** Keep the aircraft inside the play area without a hard stop. */
export function containFlight(state: FlightState): FlightState {
  const distance = Math.hypot(state.x, state.z)
  if (distance <= PLAY_RADIUS) return state
  const scale = PLAY_RADIUS / distance
  return {
    ...state,
    x: state.x * scale,
    z: state.z * scale,
    vx: state.vx * 0.4,
    vz: state.vz * 0.4,
  }
}

/**
 * Stop the skids at a floor. `verticalSpeed` is the speed before the clamp,
 * so a hard arrival still reads as fast for one frame.
 */
export function applyFloor(
  state: FlightState,
  floor: number,
): { state: FlightState; verticalSpeed: number } {
  const verticalSpeed = state.vy
  if (state.y >= floor) return { state, verticalSpeed }
  return {
    verticalSpeed,
    state: {
      ...state,
      y: floor,
      vy: state.vy < 0 ? 0 : state.vy,
    },
  }
}
