import { describe, expect, it } from 'vitest'
import { sideTowardCamera } from './sprites'

describe('sideTowardCamera', () => {
  it('shows South when the actor faces the camera', () => {
    // Actor at origin facing -Z (yaw 0). Camera sits on -Z looking toward origin.
    expect(sideTowardCamera(0, 0, 0, 0, -10)).toBe(0)
  })

  it('shows North when the actor faces away from the camera', () => {
    expect(sideTowardCamera(0, 0, 0, 0, 10)).toBe(4)
  })

  it('picks East when the actor faces +X toward a camera on +X', () => {
    expect(sideTowardCamera(Math.PI / 2, 0, 0, 10, 0)).toBe(0)
  })
})
