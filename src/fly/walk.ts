export type WalkState = {
  x: number
  z: number
  /** Facing yaw. 0 looks along -Z, matching the helicopter. */
  yaw: number
}

export type Circle = {
  x: number
  z: number
  radius: number
}

export const WALK_SPEED = 7
export const SHORE_MARGIN = 1.35

export function pushOutOfCircles(x: number, z: number, circles: readonly Circle[]): { x: number; z: number } {
  let nextX = x
  let nextZ = z
  for (const circle of circles) {
    const dx = nextX - circle.x
    const dz = nextZ - circle.z
    const distance = Math.hypot(dx, dz)
    if (distance >= circle.radius) continue
    if (distance < 0.0001) {
      nextX = circle.x + circle.radius
      continue
    }
    const scale = circle.radius / distance
    nextX = circle.x + dx * scale
    nextZ = circle.z + dz * scale
  }
  return { x: nextX, z: nextZ }
}

export function clampToDisc(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radius: number,
): { x: number; z: number } {
  const dx = x - centerX
  const dz = z - centerZ
  const distance = Math.hypot(dx, dz)
  if (distance <= radius || distance === 0) return { x, z }
  const scale = radius / distance
  return { x: centerX + dx * scale, z: centerZ + dz * scale }
}

export function stepWalk(
  state: WalkState,
  wish: { x: number; z: number },
  dt: number,
  bounds: { x: number; z: number; radius: number },
  obstacles: readonly Circle[] = [],
  speed = WALK_SPEED,
): WalkState {
  const step = Math.min(Math.max(dt, 0), 0.05)
  const length = Math.hypot(wish.x, wish.z)
  const nx = length > 1 ? wish.x / length : wish.x
  const nz = length > 1 ? wish.z / length : wish.z
  let x = state.x + nx * speed * step
  let z = state.z + nz * speed * step
  ;({ x, z } = pushOutOfCircles(x, z, obstacles))
  ;({ x, z } = clampToDisc(x, z, bounds.x, bounds.z, Math.max(1, bounds.radius - SHORE_MARGIN)))
  ;({ x, z } = pushOutOfCircles(x, z, obstacles))
  const moving = length > 0.12
  const yaw = moving ? Math.atan2(nx, -nz) : state.yaw
  return { x, z, yaw }
}
