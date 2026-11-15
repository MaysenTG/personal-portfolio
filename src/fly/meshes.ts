import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Object3D,
  type Texture,
} from 'three'
import type { FlightState } from './flight'
import { ISLANDS, type IslandDef, type IslandId } from './islands'
import { personWalkPose } from './person'
import type { Circle, WalkState } from './walk'

export type WorldFrame = {
  mode: 'fly' | 'walk'
  flight: FlightState
  walk: WalkState
  walkYaw: number
  groundY: number
  /** 0 idle, 1 full walk. Drives the person cycle. */
  walkAmount: number
  walkPhase: number
  dt: number
  time: number
}

export type World = {
  canvas: HTMLCanvasElement
  obstacles: Map<IslandId, Circle[]>
  resize: () => void
  update: (frame: WorldFrame) => void
  dispose: () => void
}

const RED = 0xc4472a
const WHITE = 0xf7f5f1
const NAVY = 0x1d3a5c
const DARK = 0x24282e
const SAND = 0xe4d2a8
const TRUNK = 0x6a4630
const LEAF = 0x1f6b34
const ROCK = 0x8a847c
const GLASS = 0x6aa8c4

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function distanceToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz || 1
  const t = Math.min(1, Math.max(0, ((px - ax) * abx + (pz - az) * abz) / len2))
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t))
}

function makeLabelTexture(text: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 192
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(22, 20, 28, 0.82)'
  context.beginPath()
  context.roundRect(18, 28, 476, 136, 28)
  context.fill()
  context.fillStyle = '#f4efe8'
  context.font = '600 72px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 256, 100)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function makeSkyTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const gradient = context.createLinearGradient(0, 0, 0, 512)
  gradient.addColorStop(0, '#1a4f9c')
  gradient.addColorStop(0.28, '#4d8fd0')
  gradient.addColorStop(0.55, '#9ec9ea')
  gradient.addColorStop(0.78, '#d7ebf4')
  gradient.addColorStop(1, '#f0e6d2')
  context.fillStyle = gradient
  context.fillRect(0, 0, 8, 512)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function makeWaterTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const base = context.createLinearGradient(0, 0, 256, 256)
  base.addColorStop(0, '#0d6a7c')
  base.addColorStop(0.45, '#148198')
  base.addColorStop(1, '#0a5570')
  context.fillStyle = base
  context.fillRect(0, 0, 256, 256)
  for (let band = 0; band < 14; band++) {
    context.fillStyle = band % 2 === 0 ? 'rgba(210, 245, 250, 0.16)' : 'rgba(6, 40, 58, 0.14)'
    context.beginPath()
    context.ellipse(128, band * 22, 180, 10, 0, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = 'rgba(255, 255, 255, 0.35)'
  for (let i = 0; i < 70; i++) {
    context.fillRect((i * 47) % 256, (i * 89) % 256, 2, 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(28, 28)
  return texture
}

export function createWorld(host: HTMLElement): World {
  const canvas = document.createElement('canvas')
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', 'Flight view')
  canvas.dataset.engine = 'fly-3d-bundle'
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
  })
  renderer.setClearColor(0x9ec9ea, 1)
  renderer.outputColorSpace = SRGBColorSpace
  host.append(canvas)

  const scene = new Scene()
  scene.fog = new FogExp2(0xc5dde8, 0.0054)
  scene.background = new Color(0x9ec9ea)

  const camera = new PerspectiveCamera(55, 1, 0.1, 1800)
  camera.position.set(0, 16, 22)

  scene.add(new AmbientLight(0xffffff, 0.28))
  scene.add(new HemisphereLight(0xe8f4ff, 0x6e9458, 0.95))
  const sun = new DirectionalLight(0xfff1d2, 1.55)
  sun.position.set(80, 120, 40)
  scene.add(sun)
  const fill = new DirectionalLight(0x9eb8ff, 0.35)
  fill.position.set(-50, 40, -60)
  scene.add(fill)

  const sky = new Mesh(
    new SphereGeometry(760, 24, 14),
    new MeshBasicMaterial({ map: makeSkyTexture(), side: DoubleSide, fog: false, depthWrite: false }),
  )
  scene.add(sky)

  const sunDisc = new Mesh(
    new SphereGeometry(18, 12, 10),
    new MeshBasicMaterial({ color: 0xffe7a8, fog: false }),
  )
  sunDisc.position.set(220, 160, -180)
  scene.add(sunDisc)

  const waterTexture = makeWaterTexture()
  const waterMaterial = new MeshPhongMaterial({
    map: waterTexture,
    color: 0xffffff,
    shininess: 90,
    specular: 0x88c8d8,
    transparent: true,
    opacity: 0.94,
  })
  const water = new Mesh(new PlaneGeometry(1700, 1700, 1, 1), waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.02
  scene.add(water)
  const waterSheen = new Mesh(
    new PlaneGeometry(1700, 1700),
    new MeshPhongMaterial({
      color: 0x7ec8d8,
      transparent: true,
      opacity: 0.12,
      shininess: 120,
      specular: 0xffffff,
      depthWrite: false,
    }),
  )
  waterSheen.rotation.x = -Math.PI / 2
  waterSheen.position.y = 0.08
  scene.add(waterSheen)

  const materials = new Map<number, MeshLambertMaterial>()
  const skyMap = sky.material.map
  const textures: Texture[] = skyMap ? [waterTexture, skyMap] : [waterTexture]

  function lambert(color: number): MeshLambertMaterial {
    const existing = materials.get(color)
    if (existing) return existing
    const material = new MeshLambertMaterial({ color })
    materials.set(color, material)
    return material
  }

  function box(
    parent: Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: number,
  ) {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), lambert(color))
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  function tube(
    parent: Group,
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    color: number,
    axis: 'x' | 'z',
  ) {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, length, 6), lambert(color))
    if (axis === 'z') mesh.rotation.x = Math.PI / 2
    else mesh.rotation.z = Math.PI / 2
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  const helicopter = buildHelicopter(box, tube, lambert)
  scene.add(helicopter.group)

  const character = buildCharacter(box, lambert)
  scene.add(character.group)

  const blobMaterial = new MeshBasicMaterial({
    color: 0x102028,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  })
  const blob = new Mesh(new CircleGeometry(1.15, 16), blobMaterial)
  blob.rotation.x = -Math.PI / 2
  scene.add(blob)

  const obstacles = new Map<IslandId, Circle[]>()
  const beacons: Mesh[] = []
  const trunkGeo = new CylinderGeometry(0.14, 0.2, 0.95, 5)
  const leafGeo = new ConeGeometry(0.9, 1.8, 6)
  const rockGeo = new DodecahedronGeometry(0.7, 0)

  for (const island of ISLANDS) {
    const built = buildIsland(island, lambert, trunkGeo, leafGeo, rockGeo, textures)
    scene.add(built.group)
    obstacles.set(island.id, built.obstacles)
    beacons.push(built.beacon)
  }

  const clouds = buildClouds(lambert)

  for (const cloud of clouds) scene.add(cloud.group)

  const desired = new Vector3()
  const look = new Vector3()
  const lookCurrent = new Vector3()
  let framed = false

  function resize() {
    const width = host.clientWidth || window.innerWidth
    const height = host.clientHeight || window.innerHeight
    if (width < 1 || height < 1) return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.6))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function update(frame: WorldFrame) {
    const { flight } = frame
    helicopter.group.position.set(flight.x, flight.y, flight.z)
    helicopter.group.rotation.order = 'YXZ'
    helicopter.group.rotation.y = -flight.yaw
    helicopter.group.rotation.x = -flight.pitch
    helicopter.group.rotation.z = -flight.roll
    const spinning = frame.mode === 'fly' ? 38 : 11
    helicopter.rotor.rotation.y += frame.dt * spinning
    helicopter.tailRotor.rotation.z += frame.dt * (spinning + 16)
    helicopter.disc.material.opacity = frame.mode === 'fly' ? 0.28 : 0.07

    const walking = frame.mode === 'walk'
    character.group.visible = walking
    const bob = walking ? Math.sin(frame.walkPhase * 2) * 0.05 * frame.walkAmount : 0
    character.group.position.set(frame.walk.x, frame.groundY + bob, frame.walk.z)
    character.group.rotation.y = -frame.walkYaw
    character.applyWalk(frame.walkPhase, frame.walkAmount)

    const anchorY = walking ? frame.groundY + 1.25 : flight.y + 1.15
    const anchorX = walking ? frame.walk.x : flight.x
    const anchorZ = walking ? frame.walk.z : flight.z
    const yaw = walking ? frame.walkYaw : flight.yaw
    const forwardX = Math.sin(yaw)
    const forwardZ = -Math.cos(yaw)
    const speed = walking ? frame.walkAmount * 7 : Math.hypot(flight.vx, flight.vz)
    const back = walking ? 5.8 : 9.8 + Math.min(speed, 24) * 0.08
    const up = walking ? 2.45 : 3.6 + Math.min(speed, 24) * 0.02
    desired.set(anchorX - forwardX * back, Math.max(1.7, anchorY + up), anchorZ - forwardZ * back)
    look.set(
      anchorX + forwardX * (walking ? 2.2 : 8 + Math.min(speed, 20) * 0.15),
      anchorY + (walking ? 0.2 : -0.15),
      anchorZ + forwardZ * (walking ? 2.2 : 8 + Math.min(speed, 20) * 0.15),
    )
    // Snap harder while turning so the camera feels locked to heading.
    const turning = !walking && Math.abs(flight.yawRate) > 0.12
    const followRate = turning ? 11 : 6
    const blend = framed ? 1 - Math.exp(-followRate * Math.max(frame.dt, 0.001)) : 1
    if (!framed) {
      camera.position.copy(desired)
      lookCurrent.copy(look)
      framed = true
    } else {
      camera.position.lerp(desired, blend)
      lookCurrent.lerp(look, blend)
    }
    camera.lookAt(lookCurrent)

    const floorY = walking ? frame.groundY : flight.y
    const altitude = walking ? 0.2 : flight.y - frame.groundY
    blob.visible = altitude < 14
    blob.position.set(anchorX, (walking ? frame.groundY : floorY) + 0.05, anchorZ)
    const spread = 1 + Math.min(altitude, 14) * 0.12
    blob.scale.setScalar(spread)
    blobMaterial.opacity = 0.32 * (1 - Math.min(altitude, 14) / 14)

    waterTexture.offset.x = (waterTexture.offset.x + frame.dt * 0.01) % 1
    waterTexture.offset.y = (waterTexture.offset.y + frame.dt * 0.018) % 1
    waterSheen.position.y = 0.08 + Math.sin(frame.time * 0.7) * 0.02
    for (const beacon of beacons) {
      const pulse = 1 + Math.sin(frame.time * 3.2 + beacon.position.x) * 0.12
      beacon.scale.setScalar(pulse)
    }
    for (const cloud of clouds) {
      cloud.group.position.x += frame.dt * cloud.speed
      if (cloud.group.position.x > 280) cloud.group.position.x = -280
    }

    renderer.render(scene, camera)
  }

  function dispose() {
    renderer.dispose()
    scene.traverse((object: Object3D) => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
      }
    })
    for (const material of materials.values()) material.dispose()
    blobMaterial.dispose()
    waterMaterial.dispose()
    waterSheen.material.dispose()
    helicopter.disc.material.dispose()
    helicopter.glass.dispose()
    for (const texture of textures) texture.dispose()
    canvas.remove()
  }

  resize()

  return { canvas, obstacles, resize, update, dispose }
}

/**
 * Low-poly Guimbal Cabri G2: bubble cabin, thin boom, three-blade main rotor,
 * and a fenestron (ducted) tail rotor.
 */
function buildHelicopter(
  box: (
    parent: Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: number,
  ) => Mesh,
  tube: (
    parent: Group,
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    color: number,
    axis: 'x' | 'z',
  ) => Mesh,
  lambert: (color: number) => MeshLambertMaterial,
) {
  const group = new Group()
  group.name = 'cabri-g2'

  // Belly and lower cabin pod
  box(group, 1.05, 0.22, 1.55, 0, 0.48, 0.05, WHITE)
  box(group, 0.98, 0.42, 1.05, 0, 0.78, 0.18, WHITE)
  box(group, 0.9, 0.16, 0.95, 0, 0.38, 0.1, NAVY)
  // Red accent stripe along the lower door line
  box(group, 1.02, 0.08, 1.08, 0, 0.58, 0.14, RED)
  // Nose shelf under the bubble
  box(group, 0.72, 0.18, 0.42, 0, 0.62, -0.72, WHITE)

  const glass = new MeshPhongMaterial({
    color: GLASS,
    transparent: true,
    opacity: 0.48,
    shininess: 140,
    specular: 0xd8f0ff,
    depthWrite: false,
  })
  // Bubble canopy (the Cabri glasshouse)
  const canopy = new Mesh(new SphereGeometry(0.72, 12, 10), glass)
  canopy.scale.set(0.92, 0.82, 1.12)
  canopy.position.set(0, 1.05, -0.18)
  group.add(canopy)
  // Door frames / cabin pillars
  box(group, 0.05, 0.72, 0.05, -0.42, 0.98, -0.35, WHITE)
  box(group, 0.05, 0.72, 0.05, 0.42, 0.98, -0.35, WHITE)
  box(group, 0.05, 0.62, 0.05, -0.42, 0.95, 0.35, WHITE)
  box(group, 0.05, 0.62, 0.05, 0.42, 0.95, 0.35, WHITE)
  // Roof fairing behind the mast
  box(group, 0.55, 0.14, 0.62, 0, 1.42, 0.22, WHITE)

  const pilot = new Mesh(new SphereGeometry(0.14, 6, 5), lambert(0xe0b090))
  pilot.position.set(0.12, 0.98, -0.12)
  group.add(pilot)
  const co = new Mesh(new SphereGeometry(0.14, 6, 5), lambert(0xe0b090))
  co.position.set(-0.12, 0.98, -0.12)
  group.add(co)
  box(group, 0.22, 0.22, 0.18, 0.12, 0.78, -0.02, NAVY)
  box(group, 0.22, 0.22, 0.18, -0.12, 0.78, -0.02, NAVY)

  // Thin tapered boom
  const boom = new Mesh(new CylinderGeometry(0.05, 0.11, 2.35, 6), lambert(WHITE))
  boom.rotation.x = Math.PI / 2
  boom.position.set(0, 0.95, 1.55)
  group.add(boom)
  box(group, 0.18, 0.12, 0.35, 0, 0.95, 0.55, WHITE)
  // Horizontal stabilizer
  box(group, 0.95, 0.04, 0.22, 0, 0.92, 2.35, WHITE)
  // Vertical fin around the fenestron
  box(group, 0.05, 0.72, 0.55, 0, 1.18, 2.72, WHITE)
  box(group, 0.04, 0.28, 0.22, 0, 1.55, 2.55, RED)

  const mast = new Mesh(new CylinderGeometry(0.04, 0.05, 0.42, 6), lambert(DARK))
  mast.position.set(0, 1.58, 0.05)
  group.add(mast)

  // Three-blade main rotor
  const rotor = new Group()
  rotor.position.set(0, 1.8, 0.05)
  const bladeMat = lambert(DARK)
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3
    const blade = new Mesh(new BoxGeometry(2.2, 0.028, 0.16), bladeMat)
    blade.rotation.y = angle
    blade.position.set(Math.cos(angle) * 1.12, 0, -Math.sin(angle) * 1.12)
    rotor.add(blade)
  }
  const hub = new Mesh(new CylinderGeometry(0.14, 0.14, 0.08, 8), lambert(DARK))
  rotor.add(hub)
  const discMaterial = new MeshBasicMaterial({
    color: 0x1c2126,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: DoubleSide,
  })
  const disc = new Mesh(new CircleGeometry(2.15, 20), discMaterial)
  disc.rotation.x = -Math.PI / 2
  rotor.add(disc)
  group.add(rotor)

  // Fenestron: ducted fan at the tail
  const fenestron = new Group()
  fenestron.position.set(0.08, 1.12, 2.78)
  const duct = new Mesh(
    new TorusGeometry(0.28, 0.045, 6, 14),
    lambert(WHITE),
  )
  duct.rotation.y = Math.PI / 2
  fenestron.add(duct)
  const shroud = new Mesh(
    new CylinderGeometry(0.3, 0.3, 0.12, 12, 1, true),
    lambert(WHITE),
  )
  shroud.rotation.z = Math.PI / 2
  fenestron.add(shroud)
  const tailRotor = new Group()
  for (let i = 0; i < 8; i++) {
    const vane = new Mesh(new BoxGeometry(0.04, 0.22, 0.03), bladeMat)
    vane.position.y = 0.11
    const holder = new Group()
    holder.rotation.z = (i * Math.PI * 2) / 8
    holder.add(vane)
    tailRotor.add(holder)
  }
  fenestron.add(tailRotor)
  group.add(fenestron)

  // High skids
  tube(group, 0.04, 2.2, -0.48, 0.12, 0.05, DARK, 'z')
  tube(group, 0.04, 2.2, 0.48, 0.12, 0.05, DARK, 'z')
  // Forward and aft cross tubes
  tube(group, 0.032, 1.05, 0, 0.32, -0.45, DARK, 'x')
  tube(group, 0.032, 1.05, 0, 0.32, 0.55, DARK, 'x')
  // Skid legs
  const legGeo = new CylinderGeometry(0.028, 0.028, 0.48, 5)
  for (const [x, z] of [
    [-0.48, -0.45],
    [0.48, -0.45],
    [-0.48, 0.55],
    [0.48, 0.55],
  ] as const) {
    const leg = new Mesh(legGeo, lambert(DARK))
    leg.position.set(x, 0.28, z)
    group.add(leg)
  }

  return { group, rotor, tailRotor, disc, glass }
}

function buildCharacter(
  box: (
    parent: Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: number,
  ) => Mesh,
  lambert: (color: number) => MeshLambertMaterial,
) {
  const group = new Group()
  const jacket = 0x243044
  const pants = 0x2c3344
  const skin = 0xe0b090

  const hips = new Group()
  hips.position.set(0, 0.92, 0)
  group.add(hips)

  function limb(
    parent: Group,
    width: number,
    height: number,
    depth: number,
    color: number,
  ): { root: Group; mesh: Mesh } {
    const root = new Group()
    parent.add(root)
    const mesh = box(root, width, height, depth, 0, -height / 2, 0, color)
    return { root, mesh }
  }

  const thighL = limb(hips, 0.16, 0.48, 0.18, pants)
  thighL.root.position.set(-0.12, 0, 0)
  const shinL = limb(thighL.root, 0.14, 0.46, 0.16, pants)
  shinL.root.position.set(0, -0.48, 0)
  box(shinL.root, 0.16, 0.08, 0.24, 0, -0.5, 0.04, DARK)

  const thighR = limb(hips, 0.16, 0.48, 0.18, pants)
  thighR.root.position.set(0.12, 0, 0)
  const shinR = limb(thighR.root, 0.14, 0.46, 0.16, pants)
  shinR.root.position.set(0, -0.48, 0)
  box(shinR.root, 0.16, 0.08, 0.24, 0, -0.5, 0.04, DARK)

  box(group, 0.46, 0.54, 0.26, 0, 1.2, 0, jacket)
  box(group, 0.2, 0.14, 0.06, 0, 1.22, 0.15, RED)
  const head = new Mesh(new SphereGeometry(0.18, 7, 6), lambert(skin))
  head.position.set(0, 1.6, 0.02)
  group.add(head)

  const shoulder = new Group()
  shoulder.position.set(0, 1.4, 0)
  group.add(shoulder)
  const armL = limb(shoulder, 0.11, 0.48, 0.12, jacket)
  armL.root.position.set(-0.3, 0, 0)
  const armR = limb(shoulder, 0.11, 0.48, 0.12, jacket)
  armR.root.position.set(0.3, 0, 0)

  group.visible = false

  function applyWalk(phase: number, amount: number) {
    const pose = personWalkPose(phase, amount)
    thighL.root.rotation.x = pose.thighL
    thighR.root.rotation.x = pose.thighR
    shinL.root.rotation.x = pose.shinL
    shinR.root.rotation.x = pose.shinR
    armL.root.rotation.x = pose.armL
    armR.root.rotation.x = pose.armR
    shoulder.position.y = pose.shoulderY
  }

  return { group, applyWalk }
}

function buildIsland(
  island: IslandDef,
  lambert: (color: number) => MeshLambertMaterial,
  trunkGeo: CylinderGeometry,
  leafGeo: ConeGeometry,
  rockGeo: DodecahedronGeometry,
  textures: Texture[],
) {
  const group = new Group()
  group.position.set(island.x, 0, island.z)
  const shelf = new Mesh(
    new CylinderGeometry(island.radius * 1.18, island.radius * 1.32, 0.7, 10),
    lambert(0x1f6d78),
  )
  shelf.position.y = 0.1
  group.add(shelf)
  const beach = new Mesh(
    new CylinderGeometry(island.radius * 1.02, island.radius * 1.14, 1.35, 10),
    lambert(SAND),
  )
  beach.position.y = 0.55
  group.add(beach)
  const grass = new Mesh(
    new CylinderGeometry(island.radius * 0.88, island.radius * 0.98, island.surfaceY, 9),
    lambert(island.grass),
  )
  grass.position.y = island.surfaceY / 2
  group.add(grass)
  const rise = new Mesh(
    new CylinderGeometry(island.radius * 0.42, island.radius * 0.58, 0.85, 7),
    lambert(island.grass + 0x0a1808),
  )
  rise.position.set(-island.radius * 0.12, island.surfaceY + 0.35, island.radius * 0.08)
  group.add(rise)

  const padX = island.padX - island.x
  const padZ = island.padZ - island.z
  const kioskX = island.kioskX - island.x
  const kioskZ = island.kioskZ - island.z
  const pad = new Group()
  pad.position.set(padX, island.surfaceY, padZ)
  const padMat = new MeshLambertMaterial({
    color: 0x2a3136,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const markMat = new MeshLambertMaterial({
    color: 0xf7f4ee,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const disc = new Mesh(new CircleGeometry(5.4, 24), padMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.y = 0.03
  pad.add(disc)
  const ring = new Mesh(new RingGeometry(4.55, 5.05, 28), markMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.045
  pad.add(ring)
  const hBar = (x: number, z: number, width: number, depth: number) => {
    const mesh = new Mesh(new BoxGeometry(width, 0.05, depth), markMat)
    mesh.position.set(x, 0.06, z)
    pad.add(mesh)
  }
  hBar(-0.48, 0, 0.26, 1.55)
  hBar(0.48, 0, 0.26, 1.55)
  hBar(0, 0, 1.22, 0.26)
  const pole = new Mesh(new CylinderGeometry(0.05, 0.05, 1.5, 5), lambert(DARK))
  pole.position.set(4.3, 0.75, 0)
  pad.add(pole)
  const beacon = new Mesh(new SphereGeometry(0.16, 6, 5), new MeshBasicMaterial({ color: 0xc24e1c }))
  beacon.position.set(padX + 4.3, island.surfaceY + 1.55, padZ)
  group.add(pad)
  group.add(beacon)

  const label = makeLabelTexture(island.label)
  textures.push(label)
  const board = new Mesh(
    new PlaneGeometry(1.7, 0.95),
    new MeshLambertMaterial({ map: label }),
  )
  const kiosk = new Group()
  kiosk.position.set(kioskX, island.surfaceY, kioskZ)
  kiosk.rotation.y = Math.atan2(padX - kioskX, padZ - kioskZ)
  const post = new Mesh(new CylinderGeometry(0.08, 0.1, 1.35, 5), lambert(TRUNK))
  post.position.y = 0.68
  kiosk.add(post)
  board.position.set(0, 1.55, 0.06)
  kiosk.add(board)
  const roof = new Mesh(new ConeGeometry(0.85, 0.55, 4), lambert(RED))
  roof.position.y = 2.2
  roof.rotation.y = Math.PI / 4
  kiosk.add(roof)
  group.add(kiosk)

  const sprite = new Sprite(
    new SpriteMaterial({ map: label, transparent: true, depthWrite: false }),
  )
  sprite.position.set(0, island.surfaceY + 10, 0)
  sprite.scale.set(12, 3.6, 1)
  group.add(sprite)

  const obstacles: Circle[] = [
    { x: island.padX, z: island.padZ, radius: 1.7 },
    { x: island.kioskX, z: island.kioskZ, radius: 1.05 },
  ]
  const rng = mulberry32(hashString(island.id))
  const places: Array<{ x: number; z: number }> = []
  function clearOfPath(x: number, z: number, gap: number) {
    if (Math.hypot(x - padX, z - padZ) < 8) return false
    if (Math.hypot(x - kioskX, z - kioskZ) < 3.4) return false
    if (distanceToSegment(x, z, padX, padZ, kioskX, kioskZ) < gap) return false
    return places.every((place) => Math.hypot(place.x - x, place.z - z) > 2.4)
  }
  function scatter(count: number, gap: number) {
    const spots: Array<{ x: number; z: number }> = []
    let attempts = 0
    while (spots.length < count && attempts < count * 12) {
      attempts += 1
      const angle = rng() * Math.PI * 2
      const reach = Math.sqrt(rng()) * island.radius * 0.78
      const x = Math.cos(angle) * reach
      const z = Math.sin(angle) * reach
      if (!clearOfPath(x, z, gap)) continue
      spots.push({ x, z })
      places.push({ x, z })
    }
    return spots
  }

  for (const spot of scatter(island.trees, 3.3)) {
    const scale = 0.85 + rng() * 0.55
    const trunk = new Mesh(trunkGeo, lambert(TRUNK))
    trunk.position.set(spot.x, island.surfaceY + 0.45 * scale, spot.z)
    trunk.scale.setScalar(scale)
    group.add(trunk)
    const leaves = new Mesh(leafGeo, lambert(LEAF))
    leaves.position.set(spot.x, island.surfaceY + 1.55 * scale, spot.z)
    leaves.scale.setScalar(scale)
    group.add(leaves)
    obstacles.push({
      x: island.x + spot.x,
      z: island.z + spot.z,
      radius: 0.75 * scale,
    })
  }
  for (const spot of scatter(island.rocks, 2.6)) {
    const rock = new Mesh(rockGeo, lambert(ROCK))
    const scale = 0.45 + rng() * 0.7
    rock.position.set(spot.x, island.surfaceY + 0.25 * scale, spot.z)
    rock.scale.set(scale, scale * 0.7, scale)
    rock.rotation.y = rng() * Math.PI
    group.add(rock)
    obstacles.push({
      x: island.x + spot.x,
      z: island.z + spot.z,
      radius: 0.55 * scale,
    })
  }

  return { group, obstacles, beacon }
}

function buildClouds(lambert: (color: number) => MeshLambertMaterial) {
  const rng = mulberry32(99)
  const puff = new SphereGeometry(1, 6, 5)
  const material = lambert(0xffffff)
  const clouds: Array<{ group: Group; speed: number }> = []
  for (let i = 0; i < 7; i++) {
    const group = new Group()
    const puffs = 3 + Math.floor(rng() * 2)
    for (let p = 0; p < puffs; p++) {
      const mesh = new Mesh(puff, material)
      mesh.position.set((p - 1) * 1.5, rng() * 0.4, rng() * 0.6)
      mesh.scale.setScalar(0.8 + rng() * 0.7)
      group.add(mesh)
    }
    group.position.set(-220 + rng() * 440, 28 + rng() * 16, -220 + rng() * 440)
    group.scale.setScalar(4 + rng() * 3)
    clouds.push({ group, speed: 1.2 + rng() * 1.6 })
  }
  return clouds
}
