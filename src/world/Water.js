import * as THREE from 'three'
import { TANK, WATER_HEIGHT } from '../config.js'
import { waterUniforms, withOutputChunks } from './WaterShared.js'
import surfaceVert from '../shaders/water.vert.glsl'
import surfaceFrag from '../shaders/water.frag.glsl'
import volumeVert from '../shaders/volume.vert.glsl'
import volumeFrag from '../shaders/volume.frag.glsl'

export class Water {
  constructor() {
    this.group = new THREE.Group()
    this.height = WATER_HEIGHT

    const surfaceGeometry = new THREE.PlaneGeometry(TANK.width - 0.01, TANK.depth - 0.01, 160, 80)
    surfaceGeometry.rotateX(-Math.PI / 2)

    this.surface = new THREE.Mesh(
      surfaceGeometry,
      new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        vertexShader: surfaceVert,
        fragmentShader: withOutputChunks(surfaceFrag),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    this.surface.position.y = this.height
    this.surface.renderOrder = 2

    const volumeGeometry = new THREE.BoxGeometry(TANK.width - 0.004, this.height, TANK.depth - 0.004)
    const index = Array.from(volumeGeometry.index.array)
    index.splice(12, 6)
    volumeGeometry.setIndex(index)

    this.volume = new THREE.Mesh(
      volumeGeometry,
      new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        vertexShader: volumeVert,
        fragmentShader: withOutputChunks(volumeFrag),
        transparent: true,
        depthWrite: false
      })
    )
    this.volume.position.y = this.height / 2
    this.volume.renderOrder = 1

    this.group.add(this.volume, this.surface)
  }

  update(elapsed) {
    waterUniforms.uTime.value = elapsed
  }
}
