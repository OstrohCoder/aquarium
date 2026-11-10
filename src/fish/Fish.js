import * as THREE from 'three'
import { Behavior } from './Behavior.js'

const TAU = Math.PI * 2
const forward = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const axisZ = new THREE.Vector3()
const axisY = new THREE.Vector3()
const basis = new THREE.Matrix4()
const target = new THREE.Quaternion()

export class Fish {
  constructor(spec, factory, position) {
    this.spec = spec

    const parts = factory.create(spec)
    this.swim = parts.swim
    this.materials = parts.materials

    this.size = spec.length * THREE.MathUtils.randFloat(0.85, 1.15)
    this.mesh = new THREE.Mesh(parts.geometry, parts.materials)
    this.mesh.scale.setScalar(this.size)
    this.mesh.position.copy(position)
    this.mesh.castShadow = true

    const heading = Math.random() * TAU
    this.velocity = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading)).multiplyScalar(spec.behavior.speed[1] * 0.5)

    this.hunger = Math.random() * 0.4
    this.cycle = Math.random() * TAU
    this.yawRate = 0
    this.heading = Math.atan2(-this.velocity.z, this.velocity.x)

    this.behavior = new Behavior(this)
    this.orient(1, true)
  }

  update(dt, ctx) {
    this.behavior.update(dt, ctx)
    this.orient(dt, false)
    this.animate(dt)
  }

  orient(dt, instant) {
    const speed = this.velocity.length()
    if (speed < 0.02) return

    forward.copy(this.velocity).divideScalar(speed)
    forward.y = THREE.MathUtils.clamp(forward.y, -0.45, 0.45)
    forward.normalize()

    axisZ.crossVectors(forward, up).normalize()
    axisY.crossVectors(axisZ, forward)
    basis.makeBasis(forward, axisY, axisZ)
    target.setFromRotationMatrix(basis)

    if (instant) {
      this.mesh.quaternion.copy(target)
    } else {
      this.mesh.quaternion.slerp(target, 1 - Math.exp(-dt * this.spec.behavior.turn))
    }

    const heading = Math.atan2(-forward.z, forward.x)
    let delta = heading - this.heading
    if (delta > Math.PI) delta -= TAU
    if (delta < -Math.PI) delta += TAU
    this.heading = heading

    if (!instant && dt > 0) {
      this.yawRate += (delta / dt - this.yawRate) * (1 - Math.exp(-dt * 6))
    }
  }

  animate(dt) {
    const { swim, behavior } = this.spec
    const speed = this.velocity.length()
    const ratio = Math.min(speed / behavior.speed[1], 1.3)

    this.cycle += dt * swim.beat * (0.5 + ratio) * TAU

    this.swim.uCycle.value = this.cycle
    this.swim.uAmp.value = swim.amp * (0.45 + 0.7 * Math.min(ratio, 1.2))
    this.swim.uBend.value = -THREE.MathUtils.clamp(this.yawRate * 0.02, -0.1, 0.1)
    this.swim.uFlap.value = swim.flap * (0.5 + 0.5 * Math.min(ratio, 1))
  }

  dispose() {
    this.materials.forEach((material) => material.dispose())
  }
}
