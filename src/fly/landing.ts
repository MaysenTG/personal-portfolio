export const LANDING = {
  maxHorizontalSpeed: 4.5,
  maxVerticalSpeed: 2.2,
  /** Radians. About 12 degrees. */
  maxTilt: 0.22,
  maxHeightAbovePad: 1.15,
  minHeightAbovePad: -0.2,
} as const

export type LandingSample = {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  pitch: number
  roll: number
  pad: { x: number; y: number; z: number; radius: number }
}

export type LandingChecks = {
  overPad: boolean
  slow: boolean
  level: boolean
  low: boolean
}

export function landingChecks(sample: LandingSample): LandingChecks {
  const dx = sample.position.x - sample.pad.x
  const dz = sample.position.z - sample.pad.z
  const height = sample.position.y - sample.pad.y
  const horizontalSpeed = Math.hypot(sample.velocity.x, sample.velocity.z)
  return {
    overPad: Math.hypot(dx, dz) <= sample.pad.radius,
    slow:
      horizontalSpeed <= LANDING.maxHorizontalSpeed &&
      Math.abs(sample.velocity.y) <= LANDING.maxVerticalSpeed,
    level: Math.abs(sample.pitch) <= LANDING.maxTilt && Math.abs(sample.roll) <= LANDING.maxTilt,
    low: height >= LANDING.minHeightAbovePad && height <= LANDING.maxHeightAbovePad,
  }
}

export function canLand(sample: LandingSample): boolean {
  const checks = landingChecks(sample)
  return checks.overPad && checks.slow && checks.level && checks.low
}
