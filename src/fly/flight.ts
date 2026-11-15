export type FlightState = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  /** Cosmetic nose tilt only. Not used as a control surface. */
  pitch: number
  /** Cosmetic bank only. */
  roll: number
  yawRate: number
}

export type PilotInput = {
  /** -1 reverse, +1 fly the way the camera faces. */
  forward: number
  /** -1 turn left, +1 turn right. Turning aims the camera. */
  turn: number
  /** -1 descend, +1 climb. */
  climb: number
}

export const FLIGHT = {
  moveAccel: 42,
  maxSpeed: 34,
  climbAccel: 22,
  maxClimb: 16,
  turnSpeed: 2.35,
  horizontalDrag: 2.4,
  verticalDrag: 2.8,
  maxHeight: 56,
  /** Visual lean while moving / turning. */
  maxPitch: 0.28,
  maxRoll: 0.38,
  leanResponse: 7,
  levelResponse: 5,
} as const

export const PLAY_RADIUS = 420

export const NEUTRAL_PILOT: PilotInput = {
  forward: 0,
  turn: 0,
  climb: 0,
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
 * Arcade flyer: turn aims the nose and camera, thrust moves along that heading,
 * climb is separate. Pitch and roll are juice, not inputs.
 */
export function stepFlight(state: FlightState, input: PilotInput, dt: number): FlightState {
  const step = clamp(dt, 0, 0.05)
  if (step === 0) return state

  const forward = clamp(input.forward, -1, 1)
  const turn = clamp(input.turn, -1, 1)
  const climb = clamp(input.climb, -1, 1)

  const yawRate = turn * FLIGHT.turnSpeed
  const yaw = state.yaw + yawRate * step

  const sinYaw = Math.sin(yaw)
  const cosYaw = Math.cos(yaw)
  const facingX = sinYaw
  const facingZ = -cosYaw

  const ax = facingX * forward * FLIGHT.moveAccel
  const az = facingZ * forward * FLIGHT.moveAccel
  const ay = climb * FLIGHT.climbAccel

  const horizontalDrag = Math.exp(-FLIGHT.horizontalDrag * step)
  const verticalDrag = Math.exp(-FLIGHT.verticalDrag * step)
  let vx = (state.vx + ax * step) * horizontalDrag
  let vz = (state.vz + az * step) * horizontalDrag
  let vy = (state.vy + ay * step) * verticalDrag

  const speed = Math.hypot(vx, vz)
  if (speed > FLIGHT.maxSpeed) {
    const scale = FLIGHT.maxSpeed / speed
    vx *= scale
    vz *= scale
  }
  vy = clamp(vy, -FLIGHT.maxClimb, FLIGHT.maxClimb)
  if (Math.abs(vx) < 0.0001) vx = 0
  if (Math.abs(vy) < 0.0001) vy = 0
  if (Math.abs(vz) < 0.0001) vz = 0

  let y = state.y + vy * step
  if (y > FLIGHT.maxHeight) {
    y = FLIGHT.maxHeight
    if (vy > 0) vy = 0
  }

  // Lean into thrust and bank into turns for feel only.
  const along =
    speed < 0.05 ? 0 : (vx * facingX + vz * facingZ) / Math.max(speed, 0.05)
  // Positive pitch reads as nose-down in the scene, which feels like thrusting forward.
  const wantPitch = clamp((along * speed) / FLIGHT.maxSpeed, -1, 1) * FLIGHT.maxPitch
  const wantRoll = clamp(-yawRate / FLIGHT.turnSpeed, -1, 1) * FLIGHT.maxRoll
  const leaning = Math.abs(forward) > 0.05 || Math.abs(turn) > 0.05
  const pitch = approach(
    state.pitch,
    wantPitch,
    leaning ? FLIGHT.leanResponse : FLIGHT.levelResponse,
    step,
  )
  const roll = approach(
    state.roll,
    wantRoll,
    leaning ? FLIGHT.leanResponse : FLIGHT.levelResponse,
    step,
  )

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
