import * as THREE from 'three'
import { TANK, WATER_HEIGHT } from '../config.js'
import { waterUniforms, withOutputChunks } from './WaterShared.js'
import rayVert from '../shaders/volume.vert.glsl'
import rayFrag from '../shaders/godrays.frag.glsl'

export class GodRays {
  constructor() {
    this.group = new THREE.Group()

    const material = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: rayVert,
      fragmentShader: withOutputChunks(rayFrag),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })

    const count = 6
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TANK.width - 0.02, WATER_HEIGHT), material)
      mesh.position.set(0, WATER_HEIGHT / 2, -1.2 + (i * 2.4) / (count - 1))
      mesh.renderOrder = 1.2
      this.group.add(mesh)
    }
  }
}
