import * as THREE from 'three'

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

export function createWoodTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(size, size)
  const dark = [78, 48, 24]
  const light = [150, 98, 52]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const plank = Math.floor(y / 64)
      const local = y % 64
      const grain = valueNoise(x * 0.025 + plank * 7.3, y * 0.5) * 0.7 + valueNoise(x * 0.09, y * 0.9 + plank) * 0.3
      const seam = local < 2 || local > 61 ? 0.35 : 1
      const k = (0.25 + 0.75 * grain) * seam
      const i = (y * size + x) * 4
      image.data[i] = dark[0] + (light[0] - dark[0]) * k
      image.data[i + 1] = dark[1] + (light[1] - dark[1]) * k
      image.data[i + 2] = dark[2] + (light[2] - dark[2]) * k
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}
