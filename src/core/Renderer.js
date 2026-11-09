import * as THREE from 'three'

export class Renderer {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    })

    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.0

    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFShadowMap

    r.setClearColor('#02161c')

    this.instance = r
    this.resize(window.innerWidth, window.innerHeight)
  }

  resize(width, height) {
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.instance.setSize(width, height)
  }

  render(scene, camera) {
    this.instance.render(scene, camera)
  }
}
