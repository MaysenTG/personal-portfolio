import type { PilotInput } from './flight'

export type WalkWish = {
  /** World-space wish, already rotated by facing. */
  x: number
  z: number
  /** -1..1 turn rate. Turning aims the camera. */
  look: number
  /** Pixel delta from dragging on the view. */
  mouse: number
}

const GAME_KEYS = new Set([
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'KeyF',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

const DEADZONE = 0.14

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function stickAxis(value: number): number {
  return Math.abs(value) < DEADZONE ? 0 : value
}

type Stick = { x: number; y: number }

function bindStick(element: HTMLElement | null): Stick {
  const stick: Stick = { x: 0, y: 0 }
  if (!element) return stick
  const root = element
  const knob = root.querySelector<HTMLElement>('.fly-stick__knob')
  let pointerId: number | null = null

  function paint(dx: number, dy: number) {
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function reset() {
    pointerId = null
    stick.x = 0
    stick.y = 0
    paint(0, 0)
  }

  function setFromEvent(event: PointerEvent) {
    const rect = root.getBoundingClientRect()
    const max = rect.width / 2
    let dx = event.clientX - (rect.left + rect.width / 2)
    let dy = event.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (max > 0 && length > max) {
      dx = (dx / length) * max
      dy = (dy / length) * max
    }
    stick.x = max === 0 ? 0 : dx / max
    stick.y = max === 0 ? 0 : -dy / max
    paint(dx, dy)
  }

  root.addEventListener('pointerdown', (event) => {
    pointerId = event.pointerId
    root.setPointerCapture(event.pointerId)
    setFromEvent(event)
    event.preventDefault()
  })
  root.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return
    setFromEvent(event)
  })
  root.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return
    reset()
  })
  root.addEventListener('pointercancel', reset)
  return stick
}

export type InputController = {
  flight: () => PilotInput & { mouse: number }
  walk: (yaw: number) => WalkWish
  consumeInteract: () => boolean
  consumeTakeoff: () => boolean
  usingTouch: () => boolean
  attachView: (view: HTMLElement, allowLook: () => boolean) => void
}

/**
 * Tank-style arcade controls: turn aims the camera, thrust moves that way.
 * Left stick / WASD drive. Right stick climbs and can also turn on touch.
 */
export function createInput(root: ParentNode, options: {
  keysAllowed: () => boolean
  collectiveAllowed: () => boolean
}): InputController {
  const held = new Set<string>()
  const pressed = new Set<string>()
  const left = bindStick(root.querySelector<HTMLElement>('#fly-stick-left'))
  const right = bindStick(root.querySelector<HTMLElement>('#fly-stick-right'))
  let touch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760
  let lookPixels = 0

  function onKeyDown(event: KeyboardEvent) {
    if (!options.keysAllowed()) return
    if (event.code === 'Space' && !options.collectiveAllowed()) return
    if (!held.has(event.code)) pressed.add(event.code)
    held.add(event.code)
    if (GAME_KEYS.has(event.code)) event.preventDefault()
  }

  function onKeyUp(event: KeyboardEvent) {
    held.delete(event.code)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', () => {
    held.clear()
  })
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') touch = true
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth < 760) touch = true
  })

  function consume(code: string): boolean {
    const hit = pressed.has(code)
    pressed.delete(code)
    return hit
  }

  function keyAxis(positive: string[], negative: string[]): number {
    const up = positive.some((code) => held.has(code)) ? 1 : 0
    const down = negative.some((code) => held.has(code)) ? 1 : 0
    return up - down
  }

  return {
    usingTouch: () => touch,
    flight: () => {
      const keyForward = keyAxis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'])
      const keyTurn = keyAxis(
        ['KeyD', 'ArrowRight', 'KeyE'],
        ['KeyA', 'ArrowLeft', 'KeyQ'],
      )
      const keyClimb =
        (held.has('Space') && options.collectiveAllowed() ? 1 : 0) -
        (held.has('ShiftLeft') || held.has('ShiftRight') ? 1 : 0)

      const stickForward = stickAxis(left.y)
      const stickTurn = stickAxis(left.x) + stickAxis(right.x) * 0.85
      const stickClimb = stickAxis(right.y)

      const mouse = lookPixels
      lookPixels = 0

      return {
        forward: clamp(keyForward !== 0 ? keyForward : stickForward, -1, 1),
        turn: clamp(keyTurn !== 0 ? keyTurn : stickTurn, -1, 1),
        climb: clamp(keyClimb !== 0 ? keyClimb : stickClimb, -1, 1),
        mouse,
      }
    },
    walk: (yaw: number) => {
      const keyForward = keyAxis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'])
      const keyTurn = keyAxis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft'])
      const moveForward = clamp(keyForward !== 0 ? keyForward : stickAxis(left.y), -1, 1)
      const look = clamp(keyTurn !== 0 ? keyTurn : stickAxis(right.x) + stickAxis(left.x) * 0.35, -1, 1)
      const fx = Math.sin(yaw)
      const fz = -Math.cos(yaw)
      const mouse = lookPixels
      lookPixels = 0
      return {
        x: fx * moveForward,
        z: fz * moveForward,
        look,
        mouse,
      }
    },
    consumeInteract: () => consume('KeyE'),
    consumeTakeoff: () => consume('KeyF'),
    attachView: (view, allowLook) => {
      let lastX: number | null = null
      view.addEventListener('pointerdown', (event) => {
        if (!allowLook()) return
        lastX = event.clientX
      })
      view.addEventListener('pointermove', (event) => {
        if (lastX === null || event.buttons !== 1 || !allowLook()) return
        lookPixels += event.clientX - lastX
        lastX = event.clientX
      })
      const end = () => {
        lastX = null
      }
      view.addEventListener('pointerup', end)
      view.addEventListener('pointercancel', end)
    },
  }
}
