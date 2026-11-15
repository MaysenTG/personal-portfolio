/** Walk-cycle joint angles for the low-poly person. Phase is in radians. */
export function personWalkPose(phase: number, amount: number) {
  const a = Math.min(1, Math.max(0, amount))
  const swing = Math.sin(phase) * 0.9 * a
  const knee = Math.max(0, Math.sin(phase)) * 0.85 * a
  const kneeOpp = Math.max(0, Math.sin(phase + Math.PI)) * 0.85 * a
  const idle = (1 - a) * Math.sin(phase * 0.35) * 0.03
  return {
    thighL: swing,
    thighR: -swing,
    shinL: knee,
    shinR: kneeOpp,
    armL: -swing * 0.75,
    armR: swing * 0.75,
    shoulderY: 1.4 + idle,
  }
}
