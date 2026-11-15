import { createFlightState, applyFloor, containFlight, stepFlight, type FlightState } from './flight'
import { createInput } from './input'
import { flightFloor, ISLANDS, nearestPad, spawnPoint, yawToward, type IslandDef } from './islands'
import { canLand, landingChecks, type LandingSample } from './landing'
import { createWorld } from './meshes'
import { stepWalk, type WalkState } from './walk'
import type { FlyController } from './types'

const HINT = {
  flyKeys: 'W S move, A D turn the camera, Space up, Shift down.',
  walkKeys: 'W S walk, A D turn, E read, F take off.',
  flyTouch: 'Left stick moves and turns. Right stick climbs.',
  walkTouch: 'Left stick walks. Right stick turns.',
} as const

const MOUSE_TURN = 0.0048

const LAND_HOLD = 0.28
const TAKEOFF_RANGE = 4.8

function islandUnder(x: number, z: number): IslandDef | null {
  for (const island of ISLANDS) {
    if (Math.hypot(x - island.x, z - island.z) <= island.radius) return island
  }
  return null
}

function islandAhead(flight: FlightState): IslandDef | null {
  const forwardX = Math.sin(flight.yaw)
  const forwardZ = -Math.cos(flight.yaw)
  let best: IslandDef | null = null
  let bestScore = 0.55
  for (const island of ISLANDS) {
    const dx = island.x - flight.x
    const dz = island.z - flight.z
    const distance = Math.hypot(dx, dz)
    if (distance < 12) continue
    const dot = (dx / distance) * forwardX + (dz / distance) * forwardZ
    if (dot > bestScore) {
      best = island
      bestScore = dot
    }
  }
  return best
}

function sampleLanding(flight: FlightState, island: IslandDef, verticalSpeed: number): LandingSample {
  return {
    position: { x: flight.x, y: flight.y, z: flight.z },
    velocity: { x: flight.vx, y: verticalSpeed, z: flight.vz },
    pitch: flight.pitch,
    roll: flight.roll,
    pad: {
      x: island.padX,
      y: island.padY,
      z: island.padZ,
      radius: island.padRadius,
    },
  }
}

export function startFlight(api: FlyController): () => void {
  let cancelled = false
  let stopSession: (() => void) | null = null

  void createWorld(api.host)
    .then((world) => {
      if (cancelled) {
        world.dispose()
        return
      }
      stopSession = runSession(api, world)
    })
    .catch((error) => {
      console.error(error)
      if (!cancelled) {
        api.showMap('The flight view did not load. The map still opens each section.')
      }
    })

  return () => {
    cancelled = true
    stopSession?.()
    stopSession = null
  }
}

function runSession(api: FlyController, world: Awaited<ReturnType<typeof createWorld>>): () => void {
  const input = createInput(document, {
    keysAllowed: () => api.keysAllowed(),
    collectiveAllowed: () => api.collectiveAllowed(),
  })
  input.attachView(world.canvas, () => api.keysAllowed())

  world.canvas.addEventListener('pointerdown', () => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== world.canvas && active.tagName === 'BUTTON' && api.keysAllowed()) {
      active.blur()
    }
  })

  let mode: 'fly' | 'walk' = 'fly'
  let flight = createFlightState({ y: 10 })
  let walk: WalkState = { x: 0, z: 0, yaw: 0 }
  let walkYaw = 0
  let landed: IslandDef | null = null
  let landTimer = 0
  let walkPhase = 0
  let walkAmount = 0
  let running = true
  let lastTime = performance.now()
  let raf = 0

  api.onRead(() => {
    if (mode !== 'walk' || !landed) return
    if (Math.hypot(walk.x - landed.kioskX, walk.z - landed.kioskZ) > landed.kioskRadius) return
    api.openPanel(landed.id)
  })
  api.onTakeoff(() => {
    if (mode !== 'walk' || !landed) return
    if (Math.hypot(walk.x - flight.x, walk.z - flight.z) > TAKEOFF_RANGE) return
    liftOff()
  })

  function liftOff() {
    mode = 'fly'
    landed = null
    landTimer = 0
    flight = {
      ...flight,
      y: flight.y + 0.45,
      vy: 8,
      vx: 0,
      vz: 0,
      pitch: 0,
      roll: 0,
    }
    api.setPrompt(null)
    api.setChecks(null)
    api.setStatus('Flying')
  }

  function parkOn(island: IslandDef) {
    const yaw = yawToward(island.padX, island.padZ, island.kioskX, island.kioskZ)
    flight = {
      ...flight,
      x: island.padX,
      y: island.padY,
      z: island.padZ,
      vx: 0,
      vy: 0,
      vz: 0,
      yawRate: 0,
      pitch: 0,
      roll: 0,
      yaw,
    }
    const spawn = spawnPoint(island)
    walk = { x: spawn.x, z: spawn.z, yaw }
    walkYaw = yaw
    landed = island
    mode = 'walk'
    landTimer = 0
    walkPhase = 0
    walkAmount = 0
  }

  function frame(now: number) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000))
    lastTime = now
    if (document.visibilityState === 'hidden') return

    api.setTouchVisible(input.usingTouch())
    const touch = input.usingTouch()

    if (!api.isPaused()) {
      if (mode === 'fly') {
        const stick = input.flight()
        // Mouse drag turns the same way the camera faces.
        const steered = {
          ...stick,
          turn: Math.max(-1, Math.min(1, stick.turn + stick.mouse * MOUSE_TURN * 18)),
        }
        flight = containFlight(stepFlight(flight, steered, dt))
        const floor = flightFloor(flight.x, flight.z)
        const applied = applyFloor(flight, floor)
        flight = applied.state
        const near = nearestPad(flight.x, flight.z)
        const showChecks = near.distance < 24
        const sample = sampleLanding(flight, near.island, applied.verticalSpeed)
        const checks = showChecks ? landingChecks(sample) : null
        api.setChecks(checks)
        if (checks && canLand(sample)) landTimer += dt
        else landTimer = 0
        if (landTimer >= LAND_HOLD) parkOn(near.island)

        if (mode === 'fly') {
          const here = islandUnder(flight.x, flight.z)
          const ahead = islandAhead(flight)
          if (showChecks) api.setStatus(`Over the ${near.island.label} pad`)
          else if (here) api.setStatus(`Over ${here.label}`)
          else if (ahead) api.setStatus(`Flying toward ${ahead.label}`)
          else api.setStatus('Flying')
          api.setHint(touch ? HINT.flyTouch : HINT.flyKeys)
          api.setPrompt(null)
          const speed = Math.hypot(flight.vx, flight.vz)
          api.setReadout(`Height ${Math.round(flight.y)}, speed ${Math.round(speed)}`)
        }
      } else if (landed) {
        const island = landed
        const wish = input.walk(walkYaw)
        walkYaw += wish.look * 1.7 * dt
        walkYaw -= wish.mouse * 0.0045
        walk = {
          ...stepWalk(
            walk,
            { x: wish.x, z: wish.z },
            dt,
            island,
            world.obstacles.get(island.id) ?? [],
          ),
          yaw: walkYaw,
        }
        const wishLen = Math.hypot(wish.x, wish.z)
        const targetAmount = wishLen > 0.12 ? Math.min(1, wishLen) : 0
        walkAmount += (targetAmount - walkAmount) * Math.min(1, dt * 10)
        if (walkAmount > 0.02) walkPhase += dt * (7.5 + walkAmount * 3.5)
        else walkPhase += dt * 1.2
        const nearKiosk = Math.hypot(walk.x - island.kioskX, walk.z - island.kioskZ) <= island.kioskRadius
        const nearHeli = Math.hypot(walk.x - flight.x, walk.z - flight.z) <= TAKEOFF_RANGE
        if (input.consumeInteract() && nearKiosk) api.openPanel(island.id)
        if (input.consumeTakeoff() && nearHeli) liftOff()
        if (mode === 'walk') {
          api.setChecks(null)
          api.setStatus(`Walking on ${island.label}`)
          api.setHint(touch ? HINT.walkTouch : HINT.walkKeys)
          api.setPrompt(nearKiosk ? 'read' : nearHeli ? 'takeoff' : null)
          api.setReadout('')
        }
      }
    } else if (mode === 'walk') {
      // Keep a soft idle sway while a panel is open.
      walkPhase += dt * 1.2
      walkAmount += (0 - walkAmount) * Math.min(1, dt * 8)
    }

    const groundY = mode === 'walk' && landed ? landed.surfaceY : flightFloor(flight.x, flight.z)
    world.update({
      mode,
      flight,
      walk,
      walkYaw,
      groundY,
      walkAmount: mode === 'walk' ? walkAmount : 0,
      walkPhase,
      dt,
      time: now / 1000,
    })
  }

  api.hideMap()
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', onResize)

  function onResize() {
    world.resize()
  }

  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    world.dispose()
  }
}
