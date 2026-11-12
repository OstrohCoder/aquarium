import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'

const noise = new ImprovedNoise()
const tint = new THREE.Color()

function fbm(x, y, z) {
  return noise.noise(x, y, z) * 0.5 + noise.noise(x * 2, y * 2, z * 2) * 0.25 + noise.noise(x * 4, y * 4, z * 4) * 0.125
}

function colorize(geometry, fn) {
  const pos = geometry.attributes.position
  const nor = geometry.attributes.normal
  const colors = new Float32Array(pos.count * 3)
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    n.fromBufferAttribute(nor, i)
    fn(p, n, c)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function weld(geometry) {
  geometry.deleteAttribute('normal')
  if (geometry.attributes.uv) geometry.deleteAttribute('uv')
  const merged = mergeVertices(geometry, 1e-4)
  merged.computeVertexNormals()
  return merged
}

function flat(geometry) {
  if (geometry.attributes.uv) geometry.deleteAttribute('uv')
  return geometry
}

export function buildRock(seed) {
  const s = seed * 1.37 + 0.31
  let g = new THREE.IcosahedronGeometry(1, 22)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g, 1e-3)

  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const f = fbm(v.x * 1.4 + s, v.y * 1.4 + s * 0.7, v.z * 1.4 + s * 1.3)
    const ridge = Math.abs(noise.noise(v.x * 3.1 + s, v.y * 3.1 + 0.2, v.z * 3.1 + 0.6))
    v.multiplyScalar(1 + 0.38 * f - 0.12 * ridge)
    v.y = Math.max(v.y, -0.45)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()

  return colorize(g, (p, n, c) => {
    const t = 0.5 + 0.5 * noise.noise(p.x * 2.2 + s, p.y * 2.2 + 0.3, p.z * 2.2 + 0.7)
    c.set('#4e4d4b').lerp(tint.set('#8c867a'), t)
    const moss = Math.max(0, n.y - 0.45) * Math.max(0, noise.noise(p.x * 3 + s, p.z * 3 + 0.5, 0.35) + 0.3)
    c.lerp(tint.set('#4a6b34'), Math.min(1, moss * 1.6))
  })
}

function tubeWood(curve, segments, baseRadius, tipRadius, seed) {
  const g = new THREE.TubeGeometry(curve, segments, 1, 10, false)
  const pos = g.attributes.position
  const center = new THREE.Vector3()
  const v = new THREE.Vector3()
  const ring = 11

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    curve.getPointAt(t, center)
    const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, Math.pow(t, 0.8))

    for (let j = 0; j < ring; j++) {
      const index = i * ring + j
      v.fromBufferAttribute(pos, index)
      const bump = noise.noise(v.x * 5 + seed, v.y * 5 + 0.3, v.z * 5 + 0.7)
      v.sub(center).normalize().multiplyScalar(radius * (1 + 0.22 * bump)).add(center)
      pos.setXYZ(index, v.x, v.y, v.z)
    }
  }

  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  return mergeVertices(g, 1e-4)
}

export function buildDriftwood(seed) {
  const s = seed * 1.37 + 0.31
  const main = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(0.45, 0.22, 0.08),
    new THREE.Vector3(0.95, 0.12, -0.12),
    new THREE.Vector3(1.45, 0.38, 0.04),
    new THREE.Vector3(1.9, 0.3, 0.2)
  ])

  const start = main.getPointAt(0.45)
  const branch = new THREE.CatmullRomCurve3([
    start,
    start.clone().add(new THREE.Vector3(0.12, 0.25, 0.1)),
    start.clone().add(new THREE.Vector3(0.22, 0.55, 0.04)),
    start.clone().add(new THREE.Vector3(0.38, 0.82, 0.14))
  ])

  const geometry = mergeGeometries([tubeWood(main, 48, 0.12, 0.04, s), tubeWood(branch, 24, 0.055, 0.02, s + 3.1)])
  geometry.computeVertexNormals()

  colorize(geometry, (p, n, c) => {
    const t = 0.5 + 0.5 * noise.noise(p.x * 6 + s, p.y * 6 + 0.2, p.z * 6 + 0.9)
    c.set('#3d2b1d').lerp(tint.set('#85694a'), t)
    c.lerp(tint.set('#b8ae9a'), Math.max(0, n.y) * 0.25)
  })

  const points = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    points.push({ p: main.getPointAt(t), r: THREE.MathUtils.lerp(0.12, 0.04, Math.pow(t, 0.8)) })
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 3
    points.push({ p: branch.getPointAt(t), r: THREE.MathUtils.lerp(0.055, 0.02, t) })
  }

  return { geometry, points }
}

export function buildColumn({ height, radius, broken, seed }) {
  const s = seed * 1.37 + 0.31
  const shaft = new THREE.CylinderGeometry(radius * 0.9, radius, height, 28, 8)
  const pos = shaft.attributes.position
  const top = height / 2

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    let y = pos.getY(i)
    const angle = Math.atan2(z, x)
    const flute = 1 + 0.035 * Math.cos(angle * 18)
    if (broken && y > top - 1e-4) {
      y -= (0.5 + 0.5 * noise.noise(x * 7 + s, z * 7 + 0.4, 2.3)) * height * 0.22
    }
    pos.setXYZ(i, x * flute, y + height / 2, z * flute)
  }

  const parts = [weld(shaft)]

  const foot = new THREE.BoxGeometry(radius * 2.5, 0.08, radius * 2.5)
  foot.translate(0, 0.04, 0)
  parts.push(flat(foot))

  if (!broken) {
    const cap = new THREE.BoxGeometry(radius * 2.4, 0.08, radius * 2.4)
    cap.translate(0, height + 0.04, 0)
    parts.push(flat(cap))
  }

  parts.forEach((g) =>
    colorize(g, (p, n, c) => {
      const t = 0.5 + 0.5 * noise.noise(p.x * 4 + s, p.y * 4 + 0.2, p.z * 4 + 0.8)
      c.set('#bdb5a3').lerp(tint.set('#8f8878'), t)
      c.lerp(tint.set('#566e3e'), Math.max(0, 1 - p.y / 0.5) * (0.5 + 0.5 * t))
    })
  )

  return mergeGeometries(parts)
}

export function buildAmphora() {
  const profile = [
    [0.001, 0], [0.09, 0.01], [0.17, 0.08], [0.25, 0.28], [0.26, 0.4], [0.21, 0.55],
    [0.11, 0.66], [0.09, 0.74], [0.13, 0.8], [0.14, 0.83], [0.1, 0.83]
  ].map(([r, y]) => new THREE.Vector2(r, y))

  const parts = [flat(new THREE.LatheGeometry(profile, 32))]

  for (const side of [1, -1]) {
    const handle = new THREE.TorusGeometry(0.1, 0.017, 8, 18, Math.PI)
    handle.rotateZ(side * -Math.PI / 2)
    handle.translate(side * 0.14, 0.62, 0)
    parts.push(flat(handle))
  }

  parts.forEach((g) =>
    colorize(g, (p, n, c) => {
      const t = 0.5 + 0.5 * noise.noise(p.x * 9 + 0.3, p.y * 9 + 0.1, p.z * 9 + 0.7)
      c.set('#b5683a').lerp(tint.set('#8a4a26'), t * 0.6)
      const band = Math.exp(-Math.pow((p.y - 0.45) / 0.012, 2)) + Math.exp(-Math.pow((p.y - 0.3) / 0.012, 2))
      c.lerp(tint.set('#2c1a10'), Math.min(1, band))
    })
  )

  return mergeGeometries(parts)
}
