import * as THREE from 'three'
import { WATER_HEIGHT } from '../config.js'
import { applyCaustics } from './Caustics.js'

const MAX = 240
const rand = THREE.MathUtils.randFloat
const dummy = new THREE.Object3D()

export class Bubbles {
  constructor(ground) {
    this.ground = ground
    this.group = new THREE.Group()
    this.params = { rate: 12 }
    this.emitters = [
      { x: -2.2, z: -0.9, timer: 0 },
      { x: 2.3, z: -0.8, timer: 0 }
    ]

    this.alive = new Uint8Array(MAX)
    this.px = new Float32Array(MAX)
    this.py = new Float32Array(MAX)
    this.pz = new Float32Array(MAX)
    this.radius = new Float32Array(MAX)
    this.speed = new Float32Array(MAX)
    this.phase = new Float32Array(MAX)
    this.cursor = 0

    const material = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.3,
      roughness: 0.02,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0,
      envMapIntensity: 2.4,
      depthWrite: false
    })

    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), material, MAX)
    this.mesh.frustumCulled = false
    this.mesh.count = MAX
    for (let i = 0; i < MAX; i++) {
      dummy.position.set(0, -10, 0)
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      this.mesh.setMatrixAt(i, dummy.matrix)
    }

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#6f8083', roughness: 0.9 })
    applyCaustics(stoneMaterial)
    this.emitters.forEach((emitter) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.07, 18), stoneMaterial)
      stone.position.set(emitter.x, ground(emitter.x, emitter.z) + 0.02, emitter.z)
      stone.castShadow = true
      stone.receiveShadow = true
      this.group.add(stone)
    })

    this.group.add(this.mesh)
  }

  spawn(x, y, z, radius, speed) {
    for (let n = 0; n < MAX; n++) {
      const i = (this.cursor + n) % MAX
      if (!this.alive[i]) {
        this.alive[i] = 1
        this.px[i] = x
        this.py[i] = y
        this.pz[i] = z
        this.radius[i] = radius
        this.speed[i] = speed
        this.phase[i] = Math.random() * Math.PI * 2
        this.cursor = (i + 1) % MAX
        return
      }
    }
  }

  burst(position, count) {
    for (let i = 0; i < count; i++) {
      const r = rand(0.008, 0.018)
      this.spawn(position.x + rand(-0.04, 0.04), position.y + rand(0, 0.05), position.z + rand(-0.04, 0.04), r, 0.2 + r * 6)
    }
  }

  update(dt, elapsed) {
    for (const emitter of this.emitters) {
      emitter.timer += dt * this.params.rate
      while (emitter.timer >= 1) {
        emitter.timer -= 1
        const r = rand(0.012, 0.04)
        this.spawn(
          emitter.x + rand(-0.04, 0.04),
          this.ground(emitter.x, emitter.z) + 0.08,
          emitter.z + rand(-0.04, 0.04),
          r,
          0.22 + r * 6
        )
      }
    }

    for (let i = 0; i < MAX; i++) {
      if (!this.alive[i]) {
        dummy.position.set(0, -10, 0)
        dummy.scale.setScalar(0)
      } else {
        this.py[i] += this.speed[i] * dt
        const wobble = this.radius[i] * 2.5 + 0.01
        const t = elapsed * (2 + this.speed[i] * 3) + this.phase[i]

        if (this.py[i] > WATER_HEIGHT - this.radius[i]) {
          this.alive[i] = 0
          dummy.position.set(0, -10, 0)
          dummy.scale.setScalar(0)
        } else {
          dummy.position.set(this.px[i] + Math.sin(t) * wobble, this.py[i], this.pz[i] + Math.cos(t * 0.8) * wobble)
          const grow = 1 + (this.py[i] / WATER_HEIGHT) * 0.25
          dummy.scale.set(this.radius[i] * grow * (1 + 0.06 * Math.sin(t * 3)), this.radius[i] * grow, this.radius[i] * grow)
        }
      }
      dummy.updateMatrix()
      this.mesh.setMatrixAt(i, dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
