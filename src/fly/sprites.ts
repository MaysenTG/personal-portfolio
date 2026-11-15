import {
  ClampToEdgeWrapping,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Camera,
} from 'three'

/** Pixor sheet rows: South, SE, East, NE, North, NW, West, SW. */
export const SIDE_COUNT = 8

export type SpriteSheet = {
  texture: Texture
  cell: number
  frames: number
  sides: number
}

export type SpriteActor = {
  mesh: Mesh
  sheet: SpriteSheet
  material: MeshBasicMaterial
  setPose: (side: number, frame: number) => void
  faceCamera: (camera: Camera) => void
  dispose: () => void
}

const loader = new TextureLoader()

export async function loadSheet(
  url: string,
  cell: number,
  frames: number,
  sides = SIDE_COUNT,
): Promise<SpriteSheet> {
  const texture = await loader.loadAsync(url)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.repeat.set(1 / frames, 1 / sides)
  texture.offset.set(0, 1 - 1 / sides)
  texture.needsUpdate = true
  return { texture, cell, frames, sides }
}

export async function loadFlySheets() {
  const [heli, person, palm, oak, boulder, grass] = await Promise.all([
    loadSheet('/assets/fly/heli/helicopter-selout-80.png', 80, 3),
    loadSheet('/assets/fly/person/villager-selout-64.png', 64, 8),
    loadSheet('/assets/fly/nature/palm-tree-selout-112.png', 112, 14),
    loadSheet('/assets/fly/nature/oak-tree-selout-112.png', 112, 16),
    loadSheet('/assets/fly/nature/boulder-selout-64.png', 64, 1),
    loadSheet('/assets/fly/nature/grass-tuft-selout-48.png', 48, 12),
  ])
  return { heli, person, palm, oak, boulder, grass }
}

export type FlySheets = Awaited<ReturnType<typeof loadFlySheets>>

/**
 * Which Pixor row to show so the sprite's front faces the camera when the
 * actor's yaw matches the camera bearing.
 */
export function sideTowardCamera(
  objectYaw: number,
  objectX: number,
  objectZ: number,
  cameraX: number,
  cameraZ: number,
): number {
  const dx = cameraX - objectX
  const dz = cameraZ - objectZ
  const bearing = Math.atan2(dx, -dz)
  let rel = objectYaw - bearing
  const tau = Math.PI * 2
  rel = ((rel + Math.PI) % tau + tau) % tau - Math.PI
  const index = Math.round(rel / (Math.PI / 4))
  return ((index % SIDE_COUNT) + SIDE_COUNT) % SIDE_COUNT
}

export function createSpriteActor(
  sheet: SpriteSheet,
  width: number,
  height = width,
): SpriteActor {
  const material = new MeshBasicMaterial({
    map: sheet.texture.clone(),
    transparent: true,
    alphaTest: 0.15,
    depthWrite: false,
    side: DoubleSide,
    fog: true,
  })
  material.map!.colorSpace = SRGBColorSpace
  material.map!.magFilter = NearestFilter
  material.map!.minFilter = NearestFilter
  material.map!.repeat.copy(sheet.texture.repeat)
  material.map!.offset.copy(sheet.texture.offset)
  material.map!.needsUpdate = true

  const mesh = new Mesh(new PlaneGeometry(width, height), material)
  mesh.frustumCulled = false

  function setPose(side: number, frame: number) {
    const map = material.map
    if (!map) return
    const s = ((side % sheet.sides) + sheet.sides) % sheet.sides
    const f = ((Math.floor(frame) % sheet.frames) + sheet.frames) % sheet.frames
    map.offset.set(f / sheet.frames, 1 - (s + 1) / sheet.sides)
  }

  function faceCamera(camera: Camera) {
    const dx = camera.position.x - mesh.position.x
    const dz = camera.position.z - mesh.position.z
    mesh.rotation.y = Math.atan2(dx, dz)
  }

  function dispose() {
    mesh.geometry.dispose()
    material.map?.dispose()
    material.dispose()
  }

  setPose(0, 0)
  return { mesh, sheet, material, setPose, faceCamera, dispose }
}
