import * as THREE from 'three'
import { WATER_HEIGHT, TANK } from '../config.js'
import { waterUniforms } from './WaterShared.js'
import { injectCaustics, applyCaustics } from './Caustics.js'
import { assets } from './Assets.js'
import swayGLSL from '../shaders/plantSway.vert.glsl'
import { createRandom } from './random.js'
import { buildBlade, buildSword, buildBranchCoral, buildBrainCoral, buildTubeCoral } from './PlantGeometry.js'

export const VEGETATION_OPTIONS = {
  'Водорості': 'seaweed',
  'Трав\'яний килим': 'meadow',
  'Корали': 'reef',
  'Без рослин': 'none'
}

const dummy = new THREE.Object3D()
const corals = ['#ff6f61', '#ff9e4a', '#d65db1', '#8e6bdc', '#f4d35e', '#4fc3b8']

function swayify(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    injectCaustics(shader)
    shader.uniforms.uTime = waterUniforms.uTime
    shader.uniforms.uSwayAmp = uniforms.uSwayAmp
    shader.uniforms.uCurrent = uniforms.uCurrent

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${swayGLSL}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n    transformed = swayDisplace(transformed);')
  }
  return material
}

function swayMaterial(uniforms) {
  return swayify(
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, metalness: 0 }),
    uniforms
  )
}

export class Plants {
  constructor({ ground, obstacles }) {
    this.ground = ground
    this.obstacles = obstacles
    this.group = new THREE.Group()
    this.params = { sway: 1 }
    this.current = 'seaweed'

    this.base = { kelp: 0.16, grass: 0.22, sword: 0.08 }
    this.uniforms = {
      kelp: { uSwayAmp: { value: this.base.kelp }, uCurrent: { value: new THREE.Vector2(0.25, 0.05) } },
      grass: { uSwayAmp: { value: this.base.grass }, uCurrent: { value: new THREE.Vector2(0.25, 0.05) } },
      sword: { uSwayAmp: { value: this.base.sword }, uCurrent: { value: new THREE.Vector2(0.25, 0.05) } }
    }

    this.geometry = {
      kelp: buildBlade({ segments: 14, width: 0.075, curl: 0.3, base: '#12401f', tip: '#8be05a' }),
      grass: buildBlade({ segments: 5, width: 0.04, curl: 0.2, base: '#2a6a24', tip: '#b8e86a' }),
      sword: buildSword(),
      branch: [1, 2, 3].map((seed) => buildBranchCoral(seed * 11)),
      brain: [1, 2].map((seed) => buildBrainCoral(seed * 5)),
      tube: [1, 2].map((seed) => buildTubeCoral(seed * 7))
    }

    this.materials = {
      kelp: swayMaterial(this.uniforms.kelp),
      grass: swayMaterial(this.uniforms.grass),
      sword: swayMaterial(this.uniforms.sword),
      coral: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, metalness: 0, side: THREE.DoubleSide })
    }
    applyCaustics(this.materials.coral)
  }

  setSway(value) {
    for (const key of Object.keys(this.uniforms)) this.uniforms[key].uSwayAmp.value = this.base[key] * value
  }

  set(name, seed = 1) {
    this.seed = seed
    this.clear()
    this.current = name
    const rng = createRandom(Math.floor(seed) * 104729 + 7)
    const builders = {
      seaweed: this.buildSeaweed,
      meadow: this.buildMeadow,
      reef: this.buildReef,
      none: () => {}
    }
    builders[name].call(this, rng)
  }

  clear() {
    this.group.children.slice().forEach((mesh) => {
      this.group.remove(mesh)
      mesh.dispose()
    })
  }

  spot(rng, xr, zr, clearance) {
    for (let i = 0; i < 24; i++) {
      const x = rng.range(xr[0], xr[1])
      const z = rng.range(zr[0], zr[1])
      const free = this.obstacles.every((o) => Math.hypot(o.center.x - x, o.center.z - z) > o.radius + clearance)
      if (free) return [x, z]
    }
    return null
  }

  instanced(geometry, material, items, colorFn) {
    if (items.length === 0) return
    const mesh = new THREE.InstancedMesh(geometry, material, items.length)

    items.forEach((item, i) => {
      dummy.position.set(item.x, this.ground(item.x, item.z) - 0.02, item.z)
      dummy.rotation.set(item.tx || 0, item.ry, item.tz || 0)
      dummy.scale.set(item.sx, item.sy, item.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, colorFn(item))
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
    mesh.frustumCulled = false
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.group.add(mesh)
  }

  grassClumps(rng, count, xr, zr) {
    const model = assets.grass
    const half = 0.5 * Math.max(model.size.x, model.size.z)
    const hx = TANK.width / 2
    const hz = TANK.depth / 2
    const items = []

    for (let i = 0; i < count; i++) {
      const s = rng.range(0.25, 0.5)
      const m = s * (half + 0.3) + 0.05
      const spot = this.spot(
        rng,
        [Math.max(xr[0], -hx + m), Math.min(xr[1], hx - m)],
        [Math.max(zr[0], -hz + m), Math.min(zr[1], hz - m)],
        0.08
      )
      if (!spot) continue
      items.push({ x: spot[0], z: spot[1], ry: rng.range(0, Math.PI * 2), sx: s, sy: s, sz: s })
    }

    assets.grass.parts.forEach(({ geometry, material }) => {
      if (!material.userData.swayed) {
        swayify(material, this.uniforms.grass)
        material.side = THREE.DoubleSide
        material.userData.swayed = true
      }
      this.instanced(geometry, material, items, () => new THREE.Color('#ffffff'))
    })
  }

  kelpClumps(rng, count) {
    const items = []
    for (let c = 0; c < count; c++) {
      const spot = this.spot(rng, [-2.7, 2.7], [-1.3, -0.35], 0.2)
      if (!spot) continue
      const blades = Math.floor(rng.range(5, 9))
      for (let b = 0; b < blades; b++) {
        const x = spot[0] + rng.range(-0.16, 0.16)
        const z = spot[1] + rng.range(-0.16, 0.16)
        const room = WATER_HEIGHT - 0.5 - this.ground(x, z)
        const width = rng.range(0.9, 1.4)
        items.push({
          x, z,
          ry: rng.range(0, Math.PI * 2),
          tx: rng.range(-0.12, 0.12),
          tz: rng.range(-0.12, 0.12),
          sx: width, sy: Math.min(rng.range(1.0, 2.3), room), sz: width,
          hue: rng.range(0.27, 0.37)
        })
      }
    }
    this.instanced(this.geometry.kelp, this.materials.kelp, items, (it) => new THREE.Color().setHSL(it.hue, 0.35, 0.8))
  }

  swordPlants(rng, count) {
    const items = []
    for (let i = 0; i < count; i++) {
      const spot = this.spot(rng, [-2.5, 2.5], [-1.0, 0.5], 0.25)
      if (!spot) continue
      const s = rng.range(0.7, 1.2)
      items.push({ x: spot[0], z: spot[1], ry: rng.range(0, Math.PI * 2), sx: s, sy: s, sz: s, hue: rng.range(0.28, 0.36) })
    }
    this.instanced(this.geometry.sword, this.materials.sword, items, (it) => new THREE.Color().setHSL(it.hue, 0.3, 0.8))
  }

  grassField(rng, count, xr, zr) {
    if (assets.grass) {
      this.grassClumps(rng, Math.ceil(count / 5), xr, zr)
      return
    }

    const items = []
    for (let i = 0; i < count; i++) {
      const spot = this.spot(rng, xr, zr, 0.08)
      if (!spot) continue
      items.push({
        x: spot[0], z: spot[1],
        ry: rng.range(0, Math.PI * 2),
        tx: rng.range(-0.15, 0.15),
        tz: rng.range(-0.15, 0.15),
        sx: rng.range(0.8, 1.3), sy: rng.range(0.18, 0.5), sz: 1,
        hue: rng.range(0.22, 0.32)
      })
    }
    this.instanced(this.geometry.grass, this.materials.grass, items, (it) => new THREE.Color().setHSL(it.hue, 0.4, 0.85))
  }

  buildSeaweed(rng) {
    this.kelpClumps(rng, 14)
    this.swordPlants(rng, 5)
    this.grassField(rng, 70, [-2.8, -1.3], [0.2, 1.3])
    this.grassField(rng, 70, [1.3, 2.8], [0.2, 1.3])
  }

  buildMeadow(rng) {
    this.grassField(rng, 700, [-2.8, 2.8], [-1.3, 1.3])
    this.swordPlants(rng, 3)
  }

  buildReef(rng) {
    const place = (geometries, count, size, zr) => {
      const items = geometries.map(() => [])
      for (let i = 0; i < count; i++) {
        const spot = this.spot(rng, [-2.6, 2.6], zr, 0.25)
        if (!spot) continue
        const s = rng.range(size[0], size[1])
        items[i % geometries.length].push({ x: spot[0], z: spot[1], ry: rng.range(0, Math.PI * 2), sx: s, sy: s, sz: s, color: rng.pick(corals) })
      }
      geometries.forEach((geometry, k) => this.instanced(geometry, this.materials.coral, items[k], (it) => new THREE.Color(it.color)))
    }

    place(this.geometry.branch, 9, [0.45, 0.95], [-1.2, 0.6])
    place(this.geometry.brain, 6, [0.18, 0.4], [-1.0, 1.0])
    place(this.geometry.tube, 5, [0.3, 0.6], [-1.2, 0.8])
    this.kelpClumps(rng, 3)
  }
}
