import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
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
  Vector3,
  WebGLRenderer,
  type Object3D,
  type Texture,
} from 'three'
import type { FlightState } from './flight'
import { ISLANDS, type IslandDef, type IslandId } from './islands'
import {
  createSpriteActor,
  loadFlySheets,
  sideTowardCamera,
  type FlySheets,
  type SpriteActor,
} from './sprites'
import type { Circle, WalkState } from './walk'

export type WorldFrame = {
  mode: 'fly' | 'walk'
  flight: FlightState
  walk: WalkState
  walkYaw: number
  groundY: number
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
const SAND = 0xe4d2a8
const TRUNK = 0x6a4630
const DARK = 0x24282e

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
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(28, 28)
  return texture
}

type PropSprite = SpriteActor & { phase: number; rate: number; yaw: number }

export async function createWorld(host: HTMLElement): Promise<World> {
  const sheets = await loadFlySheets()

  const canvas = document.createElement('canvas')
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', 'Flight view')
  canvas.dataset.engine = 'fly-3d-bundle'
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x9ec9ea, 1)
  renderer.outputColorSpace = SRGBColorSpace
  host.append(canvas)

  const scene = new Scene()
  scene.fog = new FogExp2(0xc5dde8, 0.0054)
  scene.background = new Color(0x9ec9ea)

  const camera = new PerspectiveCamera(55, 1, 0.1, 1800)
  camera.position.set(0, 16, 22)

  scene.add(new AmbientLight(0xffffff, 0.32))
  scene.add(new HemisphereLight(0xe8f4ff, 0x6e9458, 0.95))
  const sun = new DirectionalLight(0xfff1d2, 1.45)
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
  const sunDisc = new Mesh(new SphereGeometry(18, 12, 10), new MeshBasicMaterial({ color: 0xffe7a8, fog: false }))
  sunDisc.position.set(220, 160, -180)
  scene.add(sunDisc)

  const waterTexture = makeWaterTexture()
  const waterMaterial = new MeshPhongMaterial({
    map: waterTexture,
    shininess: 90,
    specular: 0x88c8d8,
    transparent: true,
    opacity: 0.94,
  })
  const water = new Mesh(new PlaneGeometry(1700, 1700), waterMaterial)
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.02
  scene.add(water)

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

  const helicopter = createSpriteActor(sheets.heli, 5.2, 5.2)
  helicopter.mesh.position.y = 1.4
  const heliRoot = new Group()
  heliRoot.add(helicopter.mesh)
  scene.add(heliRoot)

  const character = createSpriteActor(sheets.person, 1.55, 1.55)
  character.mesh.visible = false
  scene.add(character.mesh)

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
  const props: PropSprite[] = []

  for (const island of ISLANDS) {
    const built = buildIsland(island, lambert, textures, sheets, props)
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
  let heliFrame = 0
  let personFrame = 0

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
    const walking = frame.mode === 'walk'

    heliRoot.position.set(flight.x, flight.y, flight.z)
    // Keep the sprite upright; bank/pitch stay as soft juice via offset.
    heliRoot.rotation.set(-flight.pitch * 0.35, 0, -flight.roll * 0.45)
    heliFrame += frame.dt * (walking ? 4 : 14)
    const heliSide = sideTowardCamera(
      flight.yaw,
      flight.x,
      flight.z,
      camera.position.x,
      camera.position.z,
    )
    helicopter.setPose(heliSide, heliFrame)
    helicopter.faceCamera(camera)
    helicopter.mesh.visible = true

    character.mesh.visible = walking
    if (walking) {
      const bob = Math.sin(frame.walkPhase * 2) * 0.05 * frame.walkAmount
      character.mesh.position.set(frame.walk.x, frame.groundY + 0.85 + bob, frame.walk.z)
      personFrame += frame.dt * (4 + frame.walkAmount * 10)
      const personSide = sideTowardCamera(
        frame.walkYaw,
        frame.walk.x,
        frame.walk.z,
        camera.position.x,
        camera.position.z,
      )
      character.setPose(personSide, personFrame)
      character.faceCamera(camera)
    }

    const anchorY = walking ? frame.groundY + 1.25 : flight.y + 1.15
    const anchorX = walking ? frame.walk.x : flight.x
    const anchorZ = walking ? frame.walk.z : flight.z
    const yaw = walking ? frame.walkYaw : flight.yaw
    const forwardX = Math.sin(yaw)
    const forwardZ = -Math.cos(yaw)
    const speed = walking ? frame.walkAmount * 7 : Math.hypot(flight.vx, flight.vz)
    const back = walking ? 5.8 : 9.8 + Math.min(speed, 24) * 0.08
    const up = walking ? 2.45 : 3.6
    desired.set(anchorX - forwardX * back, Math.max(1.7, anchorY + up), anchorZ - forwardZ * back)
    look.set(
      anchorX + forwardX * (walking ? 2.2 : 8 + Math.min(speed, 20) * 0.15),
      anchorY,
      anchorZ + forwardZ * (walking ? 2.2 : 8 + Math.min(speed, 20) * 0.15),
    )
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
    blob.scale.setScalar(1 + Math.min(altitude, 14) * 0.12)
    blobMaterial.opacity = 0.32 * (1 - Math.min(altitude, 14) / 14)

    waterTexture.offset.x = (waterTexture.offset.x + frame.dt * 0.01) % 1
    waterTexture.offset.y = (waterTexture.offset.y + frame.dt * 0.018) % 1

    for (const prop of props) {
      prop.phase += frame.dt * prop.rate
      const side = sideTowardCamera(prop.yaw, prop.mesh.position.x, prop.mesh.position.z, camera.position.x, camera.position.z)
      prop.setPose(side, prop.phase)
      prop.faceCamera(camera)
    }
    for (const beacon of beacons) {
      beacon.scale.setScalar(1 + Math.sin(frame.time * 3.2 + beacon.position.x) * 0.12)
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
      if (object instanceof Mesh) object.geometry.dispose()
    })
    for (const material of materials.values()) material.dispose()
    blobMaterial.dispose()
    waterMaterial.dispose()
    helicopter.dispose()
    character.dispose()
    for (const prop of props) prop.dispose()
    for (const texture of textures) texture.dispose()
    for (const sheet of Object.values(sheets)) sheet.texture.dispose()
    canvas.remove()
  }

  resize()
  return { canvas, obstacles, resize, update, dispose }
}

function buildIsland(
  island: IslandDef,
  lambert: (color: number) => MeshLambertMaterial,
  textures: Texture[],
  sheets: FlySheets,
  props: PropSprite[],
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
  const board = new Mesh(new PlaneGeometry(1.7, 0.95), new MeshLambertMaterial({ map: label }))
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

  const title = new Sprite(new SpriteMaterial({ map: label, transparent: true, depthWrite: false }))
  title.position.set(0, island.surfaceY + 10, 0)
  title.scale.set(12, 3.6, 1)
  group.add(title)

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
    while (spots.length < count && attempts < count * 14) {
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

  function addProp(
    sheet: FlySheets[keyof FlySheets],
    localX: number,
    localZ: number,
    width: number,
    height: number,
    rate: number,
    radius: number,
  ) {
    const actor = createSpriteActor(sheet, width, height)
    actor.mesh.position.set(localX, island.surfaceY + height * 0.48, localZ)
    group.add(actor.mesh)
    const prop: PropSprite = {
      ...actor,
      phase: rng() * 20,
      rate,
      yaw: rng() * Math.PI * 2,
    }
    props.push(prop)
    obstacles.push({
      x: island.x + localX,
      z: island.z + localZ,
      radius,
    })
  }

  for (const spot of scatter(island.trees, 3.3)) {
    const palm = rng() > 0.45
    const scale = 0.85 + rng() * 0.55
    if (palm) {
      addProp(sheets.palm, spot.x, spot.z, 4.8 * scale, 5.4 * scale, 2.2 + rng(), 0.85 * scale)
    } else {
      addProp(sheets.oak, spot.x, spot.z, 4.4 * scale, 5.0 * scale, 1.6 + rng(), 0.9 * scale)
    }
  }
  for (const spot of scatter(island.rocks, 2.6)) {
    const scale = 0.7 + rng() * 0.7
    addProp(sheets.boulder, spot.x, spot.z, 1.5 * scale, 1.5 * scale, 0, 0.55 * scale)
  }
  for (const spot of scatter(Math.max(4, Math.floor(island.trees * 0.8)), 1.8)) {
    const scale = 0.7 + rng() * 0.5
    addProp(sheets.grass, spot.x, spot.z, 1.1 * scale, 1.1 * scale, 3 + rng() * 2, 0.2)
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
