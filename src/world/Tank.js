import * as THREE from 'three'
import { TANK, WATER_HEIGHT } from '../config.js'
import { Water } from './Water.js'

export class Tank {
  constructor() {
    this.group = new THREE.Group()
    this.water = new Water()
    this.group.add(this.water.group)

    this.buildCabinet()
    this.buildGlass()
    this.buildRim()
    this.buildRoom()

    const m = 0.25
    this.swimBounds = new THREE.Box3(
      new THREE.Vector3(-TANK.width / 2 + m, 0.45, -TANK.depth / 2 + m),
      new THREE.Vector3(TANK.width / 2 - m, WATER_HEIGHT - 0.2, TANK.depth / 2 - m)
    )
  }

  box(w, h, d, material, x, y, z, { cast = true, receive = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = cast
    mesh.receiveShadow = receive
    this.group.add(mesh)
    return mesh
  }

  buildCabinet() {
    const { width: W, depth: D, glass: g } = TANK
    const wood = new THREE.MeshStandardMaterial({ color: '#1d1611', roughness: 0.65, metalness: 0.05 })
    this.box(W + 0.4, 1.0, D + 0.4, wood, 0, -g - 0.505, 0)
  }

  buildGlass() {
    const { width: W, height: H, depth: D, glass: g } = TANK
    const material = new THREE.MeshPhysicalMaterial({
      color: '#dff8ff',
      transparent: true,
      opacity: 0.12,
      roughness: 0.02,
      metalness: 0,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
      depthWrite: false
    })

    const options = { cast: false, receive: false }
    const panels = [
      this.box(W + 2 * g, H, g, material, 0, H / 2, D / 2 + g / 2, options),
      this.box(W + 2 * g, H, g, material, 0, H / 2, -D / 2 - g / 2, options),
      this.box(g, H, D, material, -W / 2 - g / 2, H / 2, 0, options),
      this.box(g, H, D, material, W / 2 + g / 2, H / 2, 0, options),
      this.box(W + 2 * g, g, D + 2 * g, material, 0, -g / 2, 0, options)
    ]
    panels.forEach((p) => (p.renderOrder = 3))
  }

  buildRim() {
    const { width: W, height: H, depth: D, glass: g } = TANK
    const rim = new THREE.MeshStandardMaterial({ color: '#0a0d10', roughness: 0.35, metalness: 0.7 })
    const t = 0.1
    const h = 0.06
    const options = { cast: false }

    this.box(W + 2 * g + t, h, t, rim, 0, H + h / 2, D / 2 + g / 2, options)
    this.box(W + 2 * g + t, h, t, rim, 0, H + h / 2, -D / 2 - g / 2, options)
    this.box(t, h, D + 2 * g, rim, -W / 2 - g / 2, H + h / 2, 0, options)
    this.box(t, h, D + 2 * g, rim, W / 2 + g / 2, H + h / 2, 0, options)
    this.box(W + 2 * g + t, h, D + 2 * g + t, rim, 0, -g - h / 2 - 0.003, 0, options)
  }

  buildRoom() {
    const floorY = -TANK.glass - 1.0

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: '#10222a', roughness: 0.3, metalness: 0.1, fog: false })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = floorY
    floor.receiveShadow = true

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 16),
      new THREE.MeshStandardMaterial({ color: '#0b1a20', roughness: 0.9, fog: false })
    )
    wall.position.set(0, floorY + 8, -TANK.depth / 2 - 2.5)
    wall.receiveShadow = true

    this.group.add(floor, wall)
  }

  update(elapsed) {
    this.water.update(elapsed)
  }
}
