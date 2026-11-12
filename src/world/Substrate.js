import * as THREE from 'three'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'
import { TANK, SUBSTRATE_TEXTURE } from '../config.js'
import { applyCaustics } from './Caustics.js'

export class Substrate {
  constructor(loaders) {
    this.noise = new ImprovedNoise()
    this.width = TANK.width
    this.depth = TANK.depth

    const geometry = new THREE.PlaneGeometry(this.width, this.depth, 220, 110)
    geometry.rotateX(-Math.PI / 2)
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      position.setY(i, this.heightAt(position.getX(i), position.getZ(i)))
    }
    geometry.computeVertexNormals()

    this.material = new THREE.MeshStandardMaterial({
      color: '#cdb98a',
      roughness: 0.95,
      metalness: 0,
      bumpMap: this.createGrain(),
      bumpScale: 0.8
    })
    this.material.bumpMap.repeat.set(SUBSTRATE_TEXTURE.repeat[0] * 4, SUBSTRATE_TEXTURE.repeat[1] * 4)

    this.skirt = new THREE.MeshStandardMaterial({
      color: '#cdb98a',
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide
    })

    this.loadTextures(loaders)
    applyCaustics(this.material)

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.receiveShadow = true

    const skirt = new THREE.Mesh(this.buildSkirt(), this.skirt)
    skirt.receiveShadow = true
    this.mesh.add(skirt)
  }

  buildSkirt() {
    const w = this.width / 2
    const d = this.depth / 2
    const sides = [
      [[-w, d], [w, d], 220],
      [[w, d], [w, -d], 110],
      [[w, -d], [-w, -d], 220],
      [[-w, -d], [-w, d], 110]
    ]
    const positions = []
    const uvs = []
    const colors = []
    const indices = []
    let run = 0

    for (const [a, b, steps] of sides) {
      const start = positions.length / 3
      const length = Math.hypot(b[0] - a[0], b[1] - a[1])

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = a[0] + (b[0] - a[0]) * t
        const z = a[1] + (b[1] - a[1]) * t
        const top = this.heightAt(x, z)
        const s = run + t * length
        positions.push(x, top, z, x, 0, z)
        uvs.push(s / this.width, top / this.depth, s / this.width, 0)
        colors.push(1, 1, 1, 0.35, 0.35, 0.35)
      }

      for (let i = 0; i < steps; i++) {
        const t0 = start + i * 2
        indices.push(t0, t0 + 1, t0 + 2, t0 + 2, t0 + 1, t0 + 3)
      }
      run += length
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }

  heightAt(x, z) {
    const t = 0.5 - z / this.depth
    const base = 0.1 + t * 0.3 + t * t * 0.1
    const dunes = this.noise.noise(x * 0.6, z * 0.6, 1.7) * 0.09
    const ripples = this.noise.noise(x * 2.4, z * 2.4, 4.2) * 0.02
    return Math.max(0.03, base + dunes + ripples)
  }

  createGrain() {
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      const v = 90 + Math.random() * 120
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v
      data[i * 4 + 3] = 255
    }
    const texture = new THREE.DataTexture(data, size, size)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
    return texture
  }

  loadTextures(loaders) {
    const { folder, name, size, repeat } = SUBSTRATE_TEXTURE
    const base = `/textures/${folder}/${name}`

    const load = (suffix, srgb, apply) => {
      loaders.textures.load(
        `${base}_${suffix}_${size}.jpg`,
        (texture) => {
          texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(repeat[0], repeat[1])
          texture.anisotropy = loaders.maxAnisotropy
          apply(texture)
          this.material.needsUpdate = true
          this.skirt.needsUpdate = true
        },
        undefined,
        () => {}
      )
    }

    load('diff', true, (t) => {
      this.material.map = t
      this.material.color.set('#ffffff')
      this.skirt.map = t
      this.skirt.color.set('#ffffff')
    })
    load('rough', false, (t) => {
      this.material.roughnessMap = t
      this.material.roughness = 1
      this.skirt.roughnessMap = t
      this.skirt.roughness = 1
    })
    load('nor_gl', false, (t) => {
      this.material.normalMap = t
      this.material.bumpMap = null
      this.skirt.normalMap = t
    })
  }
}
