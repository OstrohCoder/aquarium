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

    this.loadTextures(loaders)
    applyCaustics(this.material)

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.receiveShadow = true
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
        },
        undefined,
        () => {}
      )
    }

    load('diff', true, (t) => {
      this.material.map = t
      this.material.color.set('#ffffff')
    })
    load('rough', false, (t) => {
      this.material.roughnessMap = t
      this.material.roughness = 1
    })
    load('nor_gl', false, (t) => {
      this.material.normalMap = t
      this.material.bumpMap = null
    })
  }
}
