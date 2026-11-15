import { describe, expect, it } from 'vitest'
import { personWalkPose } from './person'

describe('personWalkPose', () => {
  it('keeps limbs still when the walk amount is zero', () => {
    const pose = personWalkPose(1.2, 0)
    expect(pose.thighL).toBeCloseTo(0, 10)
    expect(pose.thighR).toBeCloseTo(0, 10)
    expect(pose.shinL).toBeCloseTo(0, 10)
    expect(pose.shinR).toBeCloseTo(0, 10)
    expect(pose.armL).toBeCloseTo(0, 10)
    expect(pose.armR).toBeCloseTo(0, 10)
    expect(pose.shoulderY).not.toBeCloseTo(1.4, 5)
  })

  it('swings opposite legs and arms while walking', () => {
    const pose = personWalkPose(Math.PI / 2, 1)
    expect(pose.thighL).toBeGreaterThan(0.8)
    expect(pose.thighR).toBeLessThan(-0.8)
    expect(pose.armL).toBeLessThan(-0.6)
    expect(pose.armR).toBeGreaterThan(0.6)
    expect(pose.shinL).toBeGreaterThan(0.7)
    expect(pose.shinR).toBe(0)
  })

  it('scales the stride with walk amount', () => {
    const full = personWalkPose(1, 1)
    const half = personWalkPose(1, 0.5)
    expect(half.thighL).toBeCloseTo(full.thighL * 0.5, 5)
  })
})
