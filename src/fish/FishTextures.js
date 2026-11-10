import * as THREE from 'three'

const TAU = Math.PI * 2

function smooth(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x, y) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function noise2(u, v, s) {
  const a = v * TAU
  const r = s * 0.2
  return 0.5 * (valueNoise(u * s, Math.cos(a) * r) + valueNoise(u * s + 17.3, Math.sin(a) * r + 5.1))
}

function paint(width, height, fn, srgb) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = fn((x + 0.5) / width, 1 - (y + 0.5) / height)
      const i = (y * width + x) * 4
      image.data[i] = c[0]
      image.data[i + 1] = c[1]
      image.data[i + 2] = c[2]
      image.data[i + 3] = c[3] === undefined ? 255 : c[3]
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

const BODY = {
  neon(u, v) {
    const d = Math.sin(v * TAU)
    let c = mix([232, 240, 244], [22, 54, 72], smooth(-0.35, 0.55, d))
    const stripe = Math.exp(-Math.pow((d - 0.12) / 0.16, 2)) * smooth(0.12, 0.3, u) * (1 - smooth(0.93, 1, u))
    c = mix(c, [56, 232, 255], stripe)
    const red = (1 - smooth(-0.15, 0.05, d)) * (1 - smooth(0.38, 0.52, u)) * smooth(0.03, 0.12, u)
    return mix(c, [255, 45, 60], red * 0.95)
  },
  gold(u, v) {
    const d = Math.sin(v * TAU)
    let c = mix([255, 196, 120], [236, 84, 12], smooth(-0.7, 0.6, d))
    c = mix(c, [255, 238, 214], smooth(0.55, 0.7, noise2(u, v, 6)) * 0.55)
    const k = (0.9 + 0.2 * noise2(u, v, 34)) * (1 - 0.28 * Math.exp(-Math.pow((u - 0.77) / 0.012, 2)))
    return [c[0] * k, c[1] * k, c[2] * k]
  },
  angel(u, v) {
    const d = Math.sin(v * TAU)
    let c = mix([238, 234, 216], [210, 214, 204], smooth(-0.8, 0.3, d))
    c = mix(c, [228, 190, 96], smooth(0.3, 1, d) * 0.45)
    let band = 0
    for (const center of [0.87, 0.63, 0.4]) {
      band = Math.max(band, Math.exp(-Math.pow((u - center) / 0.03, 2)))
    }
    return mix(c, [10, 10, 14], band * 0.92)
  },
  cat(u, v) {
    const d = Math.sin(v * TAU)
    let c = mix([206, 190, 160], [92, 76, 56], smooth(-0.5, 0.3, d))
    c = mix(c, [36, 28, 20], smooth(0.52, 0.6, noise2(u, v, 14)) * 0.7)
    const lateral = Math.exp(-Math.pow(d / 0.14, 2)) * smooth(0.1, 0.3, u)
    return mix(c, [46, 36, 26], lateral * 0.4)
  }
}

const FIN = {
  neon: { color: [235, 240, 250], edge: [255, 120, 120], alpha: 0.45 },
  gold: { color: [255, 140, 40], edge: [255, 200, 120], alpha: 0.8 },
  angel: { color: [210, 206, 190], edge: [40, 40, 46], alpha: 0.7 },
  cat: { color: [150, 128, 98], edge: [96, 80, 60], alpha: 0.8 }
}

export function createBodyTexture(kind) {
  return paint(512, 256, BODY[kind], true)
}

export function createFinTexture(kind) {
  const f = FIN[kind]
  return paint(128, 64, (u, v) => {
    const rays = 0.78 + 0.22 * Math.sin(v * TAU * 8)
    const alpha = (1 - 0.65 * Math.pow(u, 1.3)) * rays * f.alpha
    const c = mix(f.color, f.edge, smooth(0.3, 1, u))
    return [c[0], c[1], c[2], Math.min(255, alpha * 255)]
  }, true)
}

export function createScaleTexture(spec) {
  const [cols, rows] = spec.material.scales
  return paint(256, 128, (u, v) => {
    const gy = v * rows
    const row = Math.floor(gy)
    const gx = u * cols + (row % 2) * 0.5
    const fx = gx - Math.floor(gx) - 0.5
    const fy = gy - row - 0.5
    const h = 1 - smooth(0.28, 0.62, Math.hypot(fx, fy * 0.9))
    const c = 70 + h * 185
    return [c, c, c]
  }, false)
}
