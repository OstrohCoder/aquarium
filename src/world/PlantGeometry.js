import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'
import { createRandom } from './random.js'

const TAU = Math.PI * 2
const noise = new ImprovedNoise()

export function buildBlade({ segments = 12, width = 0.06, curl = 0.25, base = '#12401f', tip = '#8be05a' }) {
  const positions = []
  const colors = []
  const indices = []
  const c0 = new THREE.Color(base)
  const c1 = new THREE.Color(tip)
  const c = new THREE.Color()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const half = width * 0.5 * (1 - 0.85 * Math.pow(t, 1.4))
    const z = curl * t * t
    positions.push(-half, t, z, half, t, z)
    c.copy(c0).lerp(c1, t)
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function buildSword() {
  const positions = []
  const colors = []
  const indices = []
  const base = new THREE.Color('#103d1c')
  const tip = new THREE.Color('#6fcf4c')
  const c = new THREE.Color()
  const leaves = 9
  const segments = 10

  for (let k = 0; k < leaves; k++) {
    const phi = k * 2.399963
    const length = 0.78 + 0.22 * (((k * 37) % 10) / 10)
    const lean = 0.22 + 0.42 * (((k * 53) % 10) / 10)
    const cx = Math.cos(phi)
    const sz = Math.sin(phi)
    const start = positions.length / 3

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const r = lean * Math.pow(t, 1.6)
      const y = t * length * (1 - 0.22 * t)
      const half = 0.085 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.004
      c.copy(base).lerp(tip, t)

      for (const side of [-1, 1]) {
        positions.push(cx * r - sz * half * side, y, sz * r + cx * half * side)
        colors.push(c.r, c.g, c.b)
      }
    }

    for (let i = 0; i < segments; i++) {
      const a = start + i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function buildBranchCoral(seed) {
  const rng = createRandom(seed)
  const parts = []
  const up = new THREE.Vector3(0, 1, 0)

  const grow = (origin, dir, length, radius, depth) => {
    const g = new THREE.CylinderGeometry(radius * 0.72, radius, length, 8, 1)
    g.translate(0, length / 2, 0)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir))
    g.translate(origin.x, origin.y, origin.z)
    parts.push(g)

    if (depth === 0) return
    const end = origin.clone().addScaledVector(dir, length)
    const n = rng.next() > 0.55 ? 3 : 2
    for (let i = 0; i < n; i++) {
      const next = dir.clone().add(new THREE.Vector3(rng.range(-0.8, 0.8), rng.range(0.1, 0.5), rng.range(-0.8, 0.8))).normalize()
      grow(end, next, length * 0.72, radius * 0.68, depth - 1)
    }
  }

  grow(new THREE.Vector3(), up.clone(), 0.28, 0.07, 4)

  const merged = mergeGeometries(parts)
  merged.computeBoundingBox()
  const s = 1 / merged.boundingBox.max.y
  merged.scale(s, s, s)
  return merged
}

export function buildBrainCoral(seed) {
  let g = new THREE.SphereGeometry(1, 56, 40, 0, TAU, 0, Math.PI / 2)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g, 1e-4)

  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const ridge = 1 - Math.abs(noise.noise(v.x * 5.5 + seed * 1.37 + 0.31, v.y * 5.5 + seed * 0.53, v.z * 5.5 + 0.17))
    v.multiplyScalar(1 + 0.07 * Math.pow(ridge, 3) + 0.03 * noise.noise(v.x * 1.7 + 0.4, v.y * 1.7, v.z * 1.7))
    v.y *= 0.72
    pos.setXYZ(i, v.x, v.y, v.z)
  }

  g.computeVertexNormals()
  return g
}

export function buildTubeCoral(seed) {
  const rng = createRandom(seed)
  const parts = []

  for (let i = 0; i < 7; i++) {
    const h = i === 0 ? 1 : rng.range(0.5, 0.95)
    const r = rng.range(0.07, 0.12)
    const g = new THREE.CylinderGeometry(r * 1.15, r * 0.8, h, 14, 1, true)
    g.translate(0, h / 2, 0)
    g.rotateX(rng.range(-0.25, 0.25))
    g.rotateZ(rng.range(-0.25, 0.25))
    g.translate(i === 0 ? 0 : rng.range(-0.2, 0.2), 0, i === 0 ? 0 : rng.range(-0.2, 0.2))
    parts.push(g)
  }

  return mergeGeometries(parts)
}
