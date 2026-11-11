import * as THREE from 'three'
import { Vec3 } from 'cannon-es'
import { TANK, WATER_HEIGHT } from '../config.js'
import { applyCaustics } from './Caustics.js'

const MAX = 240
const rand = THREE.MathUtils.randFloat
const dummy = new THREE.Object3D()
const palette = ['#c96a24', '#b5541a', '#d98a3a', '#8f4a1e']
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const hit = new THREE.Vector3()
const color = new THREE.Color()
const force = new Vec3()

export class FoodSystem {
  constructor({ physics, foods, ground }) {
    this.physics = physics
    this.foods = foods
    this.ground = ground
    this.items = []
    this.params = { amount: 8 }
    this.onEaten = null
    this.onRot = null
    this.onDrop = null

    const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0 })
    applyCaustics(material)

    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), material, MAX)
    this.mesh.count = 0
    this.mesh.frustumCulled = false
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.setColorAt(0, color.set(palette[0]))
  }

  dropFromRay(ray) {
    if (!ray.intersectPlane(plane, hit)) return false
    if (Math.abs(hit.x) > TANK.width / 2 + 0.4) return false
    this.drop(THREE.MathUtils.clamp(hit.x, -TANK.width / 2 + 0.3, TANK.width / 2 - 0.3), rand(-0.6, 0.6), this.params.amount)
    return true
  }

  dropRandom() {
    this.drop(rand(-TANK.width / 2 + 0.6, TANK.width / 2 - 0.6), rand(-0.6, 0.6), this.params.amount)
  }

  drop(x, z, amount) {
    const count = Math.min(amount, MAX - this.items.length)
    const limit = TANK.depth / 2 - 0.12

    for (let i = 0; i < count; i++) {
      const radius = rand(0.022, 0.036)
      const position = new THREE.Vector3(
        THREE.MathUtils.clamp(x + rand(-0.25, 0.25), -TANK.width / 2 + 0.1, TANK.width / 2 - 0.1),
        WATER_HEIGHT - 0.06 - rand(0, 0.2),
        THREE.MathUtils.clamp(z + rand(-0.3, 0.3), -limit, limit)
      )
      const body = this.physics.createPellet(position, radius)
      body.velocity.set(rand(-0.05, 0.05), rand(-0.15, 0), rand(-0.05, 0.05))

      const food = { position: position.clone(), eaten: false }
      const index = this.items.length
      this.items.push({ food, body, radius, age: 0, still: 0, seed: Math.random() * 100 })
      this.foods.push(food)
      this.mesh.setColorAt(index, color.set(palette[Math.floor(Math.random() * palette.length)]))
    }

    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    if (this.onDrop && count > 0) this.onDrop(count)
  }

  discard(item) {
    this.physics.remove(item.body)
    const index = this.foods.indexOf(item.food)
    if (index >= 0) this.foods.splice(index, 1)
  }

  update(dt, elapsed) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      const { body, food } = item
      item.age += dt

      if (food.eaten) {
        this.discard(item)
        this.items.splice(i, 1)
        if (this.onEaten) this.onEaten(food)
        continue
      }

      const floor = this.ground(body.position.x, body.position.z) + item.radius
      const resting = body.position.y < floor + 0.02 && body.velocity.length() < 0.04

      if (!resting) {
        force.set(
          Math.sin(elapsed * 1.7 + item.seed) * 0.004,
          0,
          Math.cos(elapsed * 1.3 + item.seed * 1.3) * 0.004
        )
        body.applyForce(force, body.position)
        item.still = 0
      } else {
        item.still += dt
      }

      if (item.still > 25) {
        this.discard(item)
        this.items.splice(i, 1)
        if (this.onRot) this.onRot(food)
        continue
      }

      food.position.set(body.position.x, body.position.y, body.position.z)
    }

    this.mesh.count = this.items.length
    this.items.forEach((item, i) => {
      const { body } = item
      dummy.position.set(body.position.x, body.position.y, body.position.z)
      dummy.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
      dummy.scale.set(item.radius * 1.3, item.radius * 0.65, item.radius * 1.3)
      dummy.updateMatrix()
      this.mesh.setMatrixAt(i, dummy.matrix)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
