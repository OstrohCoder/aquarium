import * as THREE from 'three'
import { Sphere, Box, Vec3 } from 'cannon-es'
import { applyCaustics } from './Caustics.js'
import { createRandom } from './random.js'
import { buildRock, buildDriftwood, buildColumn, buildAmphora } from './DecorGeometry.js'
import { createWoodTexture } from './DecorTextures.js'
import { assets } from './Assets.js'

export const DECOR_OPTIONS = {
  'Скелі': 'rocks',
  'Корч': 'driftwood',
  'Руїни': 'ruins',
  'Скарб': 'treasure'
}

const dummy = new THREE.Object3D()

export class Decor {
  constructor({ physics, ground, obstacles }) {
    this.physics = physics
    this.ground = ground
    this.obstacles = obstacles
    this.group = new THREE.Group()
    this.bodies = []
    this.current = 'rocks'

    const make = (params) => {
      const material = new THREE.MeshStandardMaterial(params)
      applyCaustics(material)
      return material
    }

    this.materials = {
      stone: make({ vertexColors: true, roughness: 0.92, metalness: 0 }),
      wood: make({ vertexColors: true, roughness: 0.85, metalness: 0 }),
      planks: make({ map: createWoodTexture(), roughness: 0.75, metalness: 0, side: THREE.DoubleSide }),
      iron: make({ color: '#2f3033', roughness: 0.55, metalness: 0.85 }),
      gold: make({ color: '#e0a82e', roughness: 0.28, metalness: 1, emissive: '#7a4b00', emissiveIntensity: 0.35 }),
      clay: make({ vertexColors: true, roughness: 0.7, metalness: 0 })
    }
  }

  set(name, seed = 1) {
    this.seed = seed
    this.clear()
    this.current = name
    const rng = createRandom(Math.floor(seed) * 7919 + 13)
    const builders = {
      rocks: this.buildRocks,
      driftwood: this.buildDriftwood,
      ruins: this.buildRuins,
      treasure: this.buildTreasure
    }
    builders[name].call(this, rng)
  }

  clear() {
    this.group.children.slice().forEach((child) => {
      this.group.remove(child)
      child.traverse((object) => {
        if (object.geometry && !object.geometry.userData.shared) object.geometry.dispose()
      })
    })
    this.bodies.forEach((body) => this.physics.remove(body))
    this.bodies.length = 0
    this.obstacles.length = 0
  }

  solid(x, y, z, radius) {
    this.obstacles.push({ center: new THREE.Vector3(x, y, z), radius })
    this.bodies.push(this.physics.addStatic(new Sphere(radius), { x, y, z }))
  }

  place(geometry, material, position, rotation, scale) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    if (scale) mesh.scale.copy(scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.group.add(mesh)
    return mesh
  }

  addModel(model, x, z, { rotation = 0, scale = 1, sink = 0.03, lowest = false } = {}) {
    const sx = model.size.x * scale
    const sy = model.size.y * scale
    const sz = model.size.z * scale
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const tall = sy > 1.5 * Math.max(sx, sz)
    const alongX = sx >= sz
    const length = alongX ? sx : sz
    const thick = alongX ? sz : sx
    const r = Math.max(0.05, tall ? 0.45 * Math.max(sx, sz) : 0.45 * Math.min(thick, 1.2 * sy))
    const n = tall ? Math.max(2, Math.ceil(sy / (r * 1.6))) : Math.max(1, Math.round(length / (r * 1.6)))

    const spots = []
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.5 : k / (n - 1)
      if (tall) {
        spots.push({ wx: x, wz: z, up: r + t * (sy - 2 * r) })
      } else {
        const d = (t - 0.5) * (length - 2 * r)
        const lx = alongX ? d : 0
        const lz = alongX ? 0 : d
        spots.push({ wx: x + lx * cos + lz * sin, wz: z - lx * sin + lz * cos, up: Math.min(r, sy / 2) })
      }
    }

    const samples = tall
      ? [[x, z]]
      : [-0.5, -0.25, 0, 0.25, 0.5].map((t) => {
          const d = t * length
          const lx = alongX ? d : 0
          const lz = alongX ? 0 : d
          return [x + lx * cos + lz * sin, z - lx * sin + lz * cos]
        })
    const baseY = lowest
      ? Math.min(...samples.map(([wx, wz]) => this.ground(wx, wz))) - sink * sy
      : Math.max(...spots.map((s) => this.ground(s.wx, s.wz))) - sink * sy

    const group = new THREE.Group()
    model.parts.forEach(({ geometry, material }) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    })
    group.position.set(x, baseY, z)
    group.rotation.y = rotation
    group.scale.setScalar(scale)
    group.rotation.z -= 0.2
    this.group.add(group)

    spots.forEach((s) => this.solid(s.wx, baseY + s.up, s.wz, r))
  }

  addRock(rng, x, z, sx, sy, sz, solid = true) {
    const y = this.ground(x, z)
    this.place(
      buildRock(rng.range(1, 90)),
      this.materials.stone,
      new THREE.Vector3(x, y + sy * 0.05, z),
      new THREE.Euler(rng.range(-0.12, 0.12), rng.range(0, Math.PI * 2), rng.range(-0.12, 0.12)),
      new THREE.Vector3(sx, sy, sz)
    )
    if (solid) this.solid(x, y + sy * 0.2, z, Math.max(0.05, (sx + sz) * 0.5 * 0.85))
  }

  addPebbles(rng, count) {
    for (let i = 0; i < count; i++) {
      const s = rng.range(0.05, 0.12)
      this.addRock(rng, rng.range(-2.7, 2.7), rng.range(-1.3, 1.3), s * 1.1, s * 0.7, s, false)
    }
  }

  addDriftwood(rng, x, z, scale, rotation) {
    if (assets.trunk) {
      this.addModel(assets.trunk, x, z, { rotation, scale: scale * 1.1, sink: 0.6 })
      return
    }

    const { geometry, points } = buildDriftwood(rng.range(1, 90))
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const world = points.map(({ p, r }) => ({
      x: x + (p.x * cos + p.z * sin) * scale,
      z: z + (-p.x * sin + p.z * cos) * scale,
      y: p.y * scale,
      r: r * scale * 1.1
    }))
    const baseY = Math.max(...world.map((w) => this.ground(w.x, w.z))) - 0.05

    this.place(geometry, this.materials.wood, new THREE.Vector3(x, baseY, z), new THREE.Euler(0, rotation, 0), new THREE.Vector3(scale, scale, scale))
    world.forEach((w) => this.solid(w.x, baseY + w.y, w.z, w.r))
  }

  addColumn(rng, x, z, height, radius, broken, lying, rotation) {
    const geometry = buildColumn({ height, radius, broken, seed: rng.range(1, 90) })
    const step = radius * 1.6
    const count = Math.max(2, Math.ceil(height / step))

    if (!lying) {
      const y = this.ground(x, z) - 0.03
      this.place(geometry, this.materials.stone, new THREE.Vector3(x, y, z), new THREE.Euler(0, rotation, 0))
      for (let k = 0; k < count; k++) this.solid(x, y + 0.04 + (k * (height - 0.08)) / (count - 1), z, radius * 1.1)
      return
    }

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const y = this.ground(x, z) + radius * 0.85
    this.place(geometry, this.materials.stone, new THREE.Vector3(x, y, z), new THREE.Euler(0, rotation, -Math.PI / 2))
    for (let k = 0; k < count; k++) {
      const d = (k * height) / (count - 1)
      this.solid(x + d * cos, y, z - d * sin, radius * 1.1)
    }
  }

  addAmphora(rng, x, z, lying) {
    const scale = rng.range(0.8, 1.1)
    const y = this.ground(x, z)
    const rotation = rng.range(0, Math.PI * 2)
    const geometry = buildAmphora()

    if (lying) {
      this.place(geometry, this.materials.clay, new THREE.Vector3(x, y + 0.2 * scale, z), new THREE.Euler(0, rotation, Math.PI / 2), new THREE.Vector3(scale, scale, scale))
      this.solid(x, y + 0.2 * scale, z, 0.22 * scale)
      return
    }

    this.place(geometry, this.materials.clay, new THREE.Vector3(x, y - 0.02, z), new THREE.Euler(0, rotation, 0), new THREE.Vector3(scale, scale, scale))
    this.solid(x, y + 0.3 * scale, z, 0.22 * scale)
  }

  addChest(x, z, rotation) {
    const m = this.materials
    const baseY = this.ground(x, z) - 0.04
    const chest = new THREE.Group()
    chest.position.set(x, baseY, z)
    chest.rotation.y = rotation

    const add = (geometry, material, px, py, pz, parent = chest) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(px, py, pz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      parent.add(mesh)
      return mesh
    }

    add(new THREE.BoxGeometry(0.7, 0.03, 0.44), m.planks, 0, 0.015, 0)
    add(new THREE.BoxGeometry(0.7, 0.34, 0.03), m.planks, 0, 0.17, 0.205)
    add(new THREE.BoxGeometry(0.7, 0.34, 0.03), m.planks, 0, 0.17, -0.205)
    add(new THREE.BoxGeometry(0.03, 0.34, 0.44), m.planks, 0.335, 0.17, 0)
    add(new THREE.BoxGeometry(0.03, 0.34, 0.44), m.planks, -0.335, 0.17, 0)
    for (const sx of [-0.22, 0.22]) add(new THREE.BoxGeometry(0.05, 0.36, 0.46), m.iron, sx, 0.17, 0)
    add(new THREE.BoxGeometry(0.075, 0.09, 0.02), m.gold, 0, 0.28, 0.235)

    const pile = add(new THREE.SphereGeometry(0.3, 20, 12), m.gold, 0, 0.3, 0)
    pile.scale.set(0.95, 0.28, 0.6)

    const hinge = new THREE.Group()
    hinge.position.set(0, 0.34, -0.22)
    hinge.rotation.x = -0.95
    chest.add(hinge)

    const lid = new THREE.CylinderGeometry(0.23, 0.23, 0.7, 24, 1, false, 0, Math.PI)
    lid.rotateZ(Math.PI / 2)
    add(lid, m.planks, 0, 0, 0.23, hinge)
    add(new THREE.BoxGeometry(0.7, 0.02, 0.46), m.planks, 0, 0, 0.23, hinge)
    for (const sx of [-0.22, 0.22]) {
      const band = new THREE.CylinderGeometry(0.236, 0.236, 0.05, 24, 1, false, 0, Math.PI)
      band.rotateZ(Math.PI / 2)
      add(band, m.iron, sx, 0, 0.23, hinge)
    }

    const light = new THREE.PointLight('#ffc266', 3, 1.6, 2)
    light.position.set(0, 0.55, 0)
    chest.add(light)

    this.group.add(chest)

    const half = new Vec3(0.36, 0.2, 0.24)
    const quaternion = { x: 0, y: Math.sin(rotation / 2), z: 0, w: Math.cos(rotation / 2) }
    this.bodies.push(this.physics.addStatic(new Box(half), { x, y: baseY + 0.2, z }, quaternion))
    this.obstacles.push({ center: new THREE.Vector3(x, baseY + 0.2, z), radius: 0.4 })
  }

  addCoins(rng, x, z, rotation) {
    const pileCount = 46
    const looseCount = 16
    const baseY = this.ground(x, z) - 0.04
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 14), this.materials.gold, pileCount + looseCount)

    for (let i = 0; i < pileCount + looseCount; i++) {
      const pile = i < pileCount
      const lx = pile ? rng.range(-0.28, 0.28) : rng.range(-0.5, 0.6)
      const lz = pile ? rng.range(-0.14, 0.14) : rng.range(0.32, 0.95)
      const wx = x + lx * cos + lz * sin
      const wz = z - lx * sin + lz * cos
      const wy = pile
        ? baseY + 0.3 + 0.08 * Math.sqrt(Math.max(0, 1 - (lx / 0.28) ** 2 - (lz / 0.17) ** 2)) + 0.01
        : this.ground(wx, wz) + 0.006 + rng.range(0, 0.012)

      dummy.position.set(wx, wy, wz)
      dummy.rotation.set(pile ? rng.range(-0.5, 0.5) : rng.range(-0.1, 0.1), rng.range(0, Math.PI * 2), pile ? rng.range(-0.5, 0.5) : rng.range(-0.1, 0.1))
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.group.add(mesh)
  }

  buildRocks(rng) {
    const spots = [
      [-2.15, -0.7, 0.6, 0.45, 0.5],
      [-1.55, -0.35, 0.34, 0.27, 0.32],
      [2.05, -0.8, 0.72, 0.5, 0.56],
      [2.55, -0.05, 0.3, 0.24, 0.3],
      [0.35, -1.0, 0.3, 0.22, 0.27]
    ]
    spots.forEach(([x, z, sx, sy, sz]) =>
      this.addRock(rng, x + rng.range(-0.15, 0.15), z + rng.range(-0.1, 0.1), sx * rng.range(0.9, 1.15), sy * rng.range(0.9, 1.15), sz * rng.range(0.9, 1.15))
    )
    this.addPebbles(rng, 12)
  }

  buildDriftwood(rng) {
    this.addDriftwood(rng, -1.9, -0.5, 0.9, 0.6)
    this.addDriftwood(rng, 1.6, -0.2, 0.6, -2.2)
    this.addRock(rng, 2.3, -0.9, 0.55, 0.4, 0.5)
    this.addRock(rng, -2.4, 0.3, 0.3, 0.24, 0.3)
    this.addRock(rng, 0.2, -1.05, 0.34, 0.26, 0.3)
    this.addPebbles(rng, 10)
  }

  buildRuins(rng) {
    this.addColumn(rng, -2.0, -0.7, 0.9, 0.17, true, false, 0)
    this.addColumn(rng, -1.35, -1.0, 1.45, 0.17, false, false, 0)
    this.addColumn(rng, -0.7, -1.05, 1.2, 0.17, false, false, 0)
    this.addColumn(rng, 1.4, -0.3, 1.1, 0.17, true, true, 0.4)
    this.addAmphora(rng, 1.0, -0.9, true)
    this.addAmphora(rng, 2.4, -0.9, false)
    this.addRock(rng, 2.0, 0.3, 0.3, 0.22, 0.28)
    this.addRock(rng, -2.4, 0.2, 0.34, 0.25, 0.3)
    this.addPebbles(rng, 10)
  }

  buildTreasure(rng) {
    this.addChest(1.5, -0.55, -0.45)
    this.addCoins(rng, 1.5, -0.55, -0.45)
    this.addAmphora(rng, -1.9, -0.8, false)
    this.addAmphora(rng, -1.2, -0.3, true)
    this.addRock(rng, -2.4, -0.4, 0.55, 0.4, 0.5)
    this.addRock(rng, 2.5, -1.0, 0.5, 0.36, 0.45)
    this.addRock(rng, 0.2, -1.05, 0.3, 0.22, 0.27)
    this.addPebbles(rng, 10)
  }
}
