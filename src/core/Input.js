import * as THREE from 'three'

export class Input extends EventTarget {
  constructor(canvas) {
    super()
    this.canvas = canvas
    this.pointer = new THREE.Vector2(9999, 9999)
    this.inside = false
    this.raycaster = new THREE.Raycaster()
    this._down = null

    canvas.addEventListener('pointermove', (e) => {
      this.inside = true
      this._setPointer(e)
    })
    canvas.addEventListener('pointerleave', () => {
      this.inside = false
      this.pointer.set(9999, 9999)
    })
    canvas.addEventListener('pointerdown', (e) => {
      this._down = { x: e.clientX, y: e.clientY, t: performance.now() }
    })
    canvas.addEventListener('pointerup', (e) => {
      if (!this._down) return
      const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y)
      const dt = performance.now() - this._down.t
      this._down = null
      if (moved < 5 && dt < 300) {
        this._setPointer(e)
        this.dispatchEvent(new CustomEvent('click', { detail: { pointer: this.pointer.clone() } }))
      }
    })
  }

  _setPointer(e) {
    const r = this.canvas.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1
    )
  }

  getRay(camera) {
    this.raycaster.setFromCamera(this.pointer, camera)
    return this.raycaster.ray
  }

  intersectObjects(objects, camera, recursive = true) {
    this.raycaster.setFromCamera(this.pointer, camera)
    return this.raycaster.intersectObjects(objects, recursive)
  }

  intersectPlane(plane, camera, target = new THREE.Vector3()) {
    this.raycaster.setFromCamera(this.pointer, camera)
    return this.raycaster.ray.intersectPlane(plane, target)
  }
}
