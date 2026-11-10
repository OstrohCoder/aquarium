import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const TAU = Math.PI * 2

function capEnds(t, tailEdge, headEdge) {
  if (t < tailEdge) {
    const x = (tailEdge - t) / tailEdge
    return Math.sqrt(Math.max(0, 1 - x * x))
  }
  if (t > 1 - headEdge) {
    const x = (t - (1 - headEdge)) / headEdge
    return Math.sqrt(Math.max(0, 1 - x * x))
  }
  return 1
}

export function bodyProfile(t, body) {
  const k = Math.log(0.5) / Math.log(body.peak)
  const s = Math.max(Math.sin(Math.PI * Math.pow(t, k)), 0)
  const f = Math.pow(s, body.round)
  return (body.peduncle + (1 - body.peduncle) * f) * capEnds(t, 0.03, 0.06)
}

function withFlap(geometry, values) {
  const count = geometry.attributes.position.count
  const array = new Float32Array(count)
  if (values) for (let i = 0; i < count; i++) array[i] = values[i]
  geometry.setAttribute('aFlap', new THREE.BufferAttribute(array, 1))
  return geometry
}

function buildBody(spec) {
  const { body } = spec
  const N = 48
  const R = 20
  const positions = []
  const uvs = []
  const indices = []

  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = bodyProfile(t, body)
    const x = t - 0.5
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * TAU
      const s = Math.sin(a)
      const c = Math.cos(a)
      positions.push(x, s * body.height * p * (s >= 0 ? body.up : body.down), c * body.width * p)
      uvs.push(t, j / R)
    }
  }

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j
      const b = a + 1
      const c = a + (R + 1)
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const normal = geometry.attributes.normal
  const n = new THREE.Vector3()
  for (let i = 0; i <= N; i++) {
    const a = i * (R + 1)
    const b = a + R
    n.set(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b)).normalize()
    normal.setXYZ(a, n.x, n.y, n.z)
    normal.setXYZ(b, n.x, n.y, n.z)
  }

  return withFlap(geometry)
}

function buildFin(segU, segV, fn, flap) {
  const geometry = new THREE.PlaneGeometry(1, 1, segU, segV)
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  const values = new Float32Array(position.count)

  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    const p = fn(u, v)
    position.setXYZ(i, p[0], p[1], p[2])
    values[i] = flap ? flap(u, v) : 0
  }

  geometry.computeVertexNormals()
  return withFlap(geometry, values)
}

function buildFins(spec) {
  const { body, tail, dorsal, anal, pectoral, pelvic } = spec
  const fins = []

  fins.push(
    buildFin(8, 10, (u, v) => {
      const q = Math.abs(2 * v - 1)
      const x = -0.49 - tail.length * u * (1 - tail.fork * (1 - q) * u)
      const y = (v - 0.5) * 2 * tail.spread * (0.2 + 0.8 * u)
      return [x, y, 0]
    })
  )

  const ridge = (def, sign, edge) =>
    buildFin(
      6,
      12,
      (u, v) => {
        const t = def.start + (def.end - def.start) * v
        const root = body.height * bodyProfile(t, body) * edge * 0.9
        const h = def.height * Math.pow(Math.sin(Math.PI * v), 0.7) * (1.15 - 0.3 * v)
        return [t - 0.5 - u * h * 0.3, sign * (root + u * h), 0]
      },
      (u) => u * 0.4
    )

  fins.push(ridge(dorsal, 1, body.up))
  if (anal) fins.push(ridge(anal, -1, body.down))

  for (const side of [1, -1]) {
    fins.push(
      buildFin(
        5,
        6,
        (u, v) => {
          const pr = bodyProfile(pectoral.t, body)
          const along = (v - 0.5) * pectoral.base
          const x = pectoral.t - 0.5 + along * (1 - u) - u * pectoral.length * 0.9
          const y = -body.height * pr * 0.25 * body.down + along * 0.3 * (1 - u) - u * pectoral.length * 0.25
          const z = side * (body.width * pr * 0.9 + u * pectoral.length * 0.55)
          return [x, y, z]
        },
        (u) => u
      )
    )
  }

  if (pelvic) {
    for (const side of [1, -1]) {
      fins.push(
        buildFin(
          8,
          2,
          (u, v) => {
            const pr = bodyProfile(pelvic.t, body)
            const y0 = -body.height * pr * body.down * 0.9
            return [pelvic.t - 0.5 - u * pelvic.length * 0.25 + (v - 0.5) * 0.03, y0 - u * pelvic.length, side * 0.02 + (v - 0.5) * 0.01]
          },
          (u) => u * 0.5
        )
      )
    }
  }

  return mergeGeometries(fins, false)
}

function buildEyes(spec) {
  const { body, eye } = spec
  const whites = []
  const pupils = []
  const pr = bodyProfile(eye.t, body)

  for (const side of [1, -1]) {
    const x = eye.t - 0.5
    const y = body.height * pr * eye.y * body.up
    const z = side * body.width * pr * 0.88

    const white = new THREE.SphereGeometry(eye.size, 16, 12)
    white.translate(x, y, z)
    whites.push(withFlap(white))

    const pupil = new THREE.SphereGeometry(eye.size * 0.62, 14, 10)
    pupil.translate(x + eye.size * 0.12, y, z + side * eye.size * 0.55)
    pupils.push(withFlap(pupil))
  }

  return [mergeGeometries(whites, false), mergeGeometries(pupils, false)]
}

export function buildFishGeometry(spec) {
  const [whites, pupils] = buildEyes(spec)
  return mergeGeometries([buildBody(spec), buildFins(spec), whites, pupils], true)
}
