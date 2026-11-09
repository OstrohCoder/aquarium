import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class CameraRig {
  constructor(canvas, aspect) {
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100)
    this.camera.position.set(0, 1.8, 9.5)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.target.set(0, 1.5, 0)

    this.setFree(false)
  }

  setFree(free) {
    const c = this.controls
    this.free = free

    if (free) {
      c.minDistance = 0.4
      c.maxDistance = 40
      c.minAzimuthAngle = -Infinity
      c.maxAzimuthAngle = Infinity
      c.minPolarAngle = 0
      c.maxPolarAngle = Math.PI
      c.enablePan = true
    } else {
      c.minDistance = 5
      c.maxDistance = 13
      c.minAzimuthAngle = -0.8
      c.maxAzimuthAngle = 0.8
      c.minPolarAngle = 0.8
      c.maxPolarAngle = 1.75
      c.enablePan = false
    }
    c.update()
  }

  resize(aspect) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update() {
    this.controls.update()
  }
}
