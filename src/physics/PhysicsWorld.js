import * as CANNON from 'cannon-es'
import { TANK } from '../config.js'

export class PhysicsWorld {
  constructor(ground) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -1.1, 0) })
    this.world.allowSleep = true
    this.world.defaultContactMaterial.friction = 0.6
    this.world.defaultContactMaterial.restitution = 0.05

    this.buildWalls()
    this.buildGround(ground)
  }

  buildWalls() {
    const hw = TANK.width / 2
    const hd = TANK.depth / 2
    const walls = [
      [[-hw, 0, 0], [0, Math.PI / 2, 0]],
      [[hw, 0, 0], [0, -Math.PI / 2, 0]],
      [[0, 0, -hd], [0, 0, 0]],
      [[0, 0, hd], [0, Math.PI, 0]]
    ]

    walls.forEach(([position, rotation]) => {
      const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
      body.position.set(...position)
      body.quaternion.setFromEuler(...rotation)
      this.world.addBody(body)
    })
  }

  buildGround(ground) {
    const step = 0.05
    const nx = Math.round(TANK.width / step) + 1
    const nz = Math.round(TANK.depth / step) + 1
    const data = []

    for (let i = 0; i < nx; i++) {
      const column = []
      for (let j = 0; j < nz; j++) {
        column.push(ground(-TANK.width / 2 + i * step, TANK.depth / 2 - j * step))
      }
      data.push(column)
    }

    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Heightfield(data, { elementSize: step }) })
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    body.position.set(-TANK.width / 2, 0, TANK.depth / 2)
    this.world.addBody(body)
    this.groundBody = body
  }

  addStatic(shape, position, quaternion) {
    const body = new CANNON.Body({ mass: 0, shape })
    body.position.set(position.x, position.y, position.z)
    if (quaternion) body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    this.world.addBody(body)
    return body
  }

  createPellet(position, radius = 0.03) {
    const body = new CANNON.Body({
      mass: 0.02,
      shape: new CANNON.Sphere(radius),
      linearDamping: 0.9,
      angularDamping: 0.6,
      allowSleep: true,
      sleepSpeedLimit: 0.05,
      sleepTimeLimit: 1
    })
    body.position.set(position.x, position.y, position.z)
    this.world.addBody(body)
    return body
  }

  remove(body) {
    this.world.removeBody(body)
  }

  step(dt) {
    this.world.step(1 / 60, dt, 3)
  }
}
