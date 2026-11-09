import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export class Loaders {
  constructor() {
    this.bar = document.querySelector('#loader-bar')
    this.overlay = document.querySelector('#loader')

    this.manager = new THREE.LoadingManager()
    this.manager.onProgress = (_url, loaded, total) => this._progress(loaded / total)
    this.manager.onLoad = () => this.done()

    this.textures = new THREE.TextureLoader(this.manager)
    this.gltf = new GLTFLoader(this.manager)
    this.maxAnisotropy = 8
  }

  _progress(p) {
    if (!this.bar) return
    const pct = Math.round(p * 100)
    this.bar.style.background =
      `linear-gradient(90deg, #4fd8ff ${pct}%, #12323b ${pct}%)`
  }

  done() {
    this.overlay?.classList.add('hidden')
  }

  loadTexture(url, { srgb = false, repeat = [1, 1] } = {}) {
    const t = this.textures.load(url)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
    t.anisotropy = this.maxAnisotropy
    return t
  }

  loadPBR(folder, name, { repeat = [1, 1], size = '1k' } = {}) {
    const base = `/textures/${folder}/${name}`
    return {
      map: this.loadTexture(`${base}_diff_${size}.jpg`, { srgb: true, repeat }),
      roughnessMap: this.loadTexture(`${base}_rough_${size}.jpg`, { repeat }),
      normalMap: this.loadTexture(`${base}_nor_gl_${size}.jpg`, { repeat })
    }
  }

  loadGLTF(url) {
    return this.gltf.loadAsync(url)
  }
}
