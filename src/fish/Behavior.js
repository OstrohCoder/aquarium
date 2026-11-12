import * as THREE from 'three'

const acc = new THREE.Vector3()
const tmp = new THREE.Vector3()
const center = new THREE.Vector3()
const align = new THREE.Vector3()
const separation = new THREE.Vector3()
const closest = new THREE.Vector3()

const rand = THREE.MathUtils.randFloat

export class Behavior {
  constructor(fish) {
    this.fish = fish
    this.target = new THREE.Vector3()
    this.timer = 0
    this.rest = 0
    this.panic = 0
    this.cruise = rand(0.3, 0.8)
  }

  update(dt, ctx) {
    const fish = this.fish
    const b = fish.spec.behavior
    const pos = fish.mesh.position
    const vel = fish.velocity

    acc.set(0, 0, 0)
    fish.hunger = Math.min(1, fish.hunger + dt * ctx.hungerRate)
    this.panic = Math.max(0, this.panic - dt * 0.7)

    this.timer -= dt
    if (this.timer <= 0 || pos.distanceTo(this.target) < 0.35) this.pickTarget(ctx)

    const minSpeed = b.speed[0]
    let maxSpeed = b.speed[1]
    const food = this.findFood(ctx)

    if (food) {
      maxSpeed *= 1.3
      this.seek(food.position, maxSpeed, 1.6)
      this.tryEat(food, ctx)
    } else if (this.rest > 0) {
      this.rest -= dt
    } else {
      this.seek(this.target, minSpeed + (maxSpeed - minSpeed) * this.cruise, 1)
    }

    this.flock(ctx, b)
    this.cursor(ctx, b)
    this.bound(ctx, b)
    this.avoid(ctx)

    acc.clampLength(0, b.accel * 2.5 * (1 + 2 * this.panic))
    vel.addScaledVector(acc, dt)
    vel.y *= 1 - Math.min(dt * 0.8, 1)
    if (b.bottom) vel.y = 0

    const cap = maxSpeed * (1 + 0.8 * this.panic)
    const speed = vel.length()
    if (this.rest > 0 && !food) {
      vel.multiplyScalar(Math.exp(-dt * 3))
    } else if (speed > cap) {
      vel.multiplyScalar(cap / speed)
    } else if (speed < minSpeed) {
      if (speed < 1e-4) vel.set(1, 0, 0)
      vel.setLength(minSpeed)
    }

    pos.addScaledVector(vel, dt)

    if (b.bottom) {
      const gy = ctx.ground(pos.x, pos.z) + fish.size * 0.1
      pos.y += (gy - pos.y) * Math.min(1, dt * 8)
    }

    this.clamp(ctx, b)
  }

  seek(point, speed, weight) {
    const pos = this.fish.mesh.position
    tmp.copy(point).sub(pos)
    const dist = tmp.length()
    if (dist < 1e-5) return
    const arrive = Math.min(1, dist / 0.5)
    tmp.multiplyScalar((speed * arrive) / dist).sub(this.fish.velocity).multiplyScalar(weight)
    acc.add(tmp)
  }

  pickTarget(ctx) {
    const fish = this.fish
    const b = fish.spec.behavior
    const { min, max } = ctx.bounds
    const margin = 0.5
    const group = b.school ? ctx.groups.get(fish.spec.id) : null

    if (group) {
      this.target.copy(group.target).add(tmp.set(rand(-0.6, 0.6), rand(-0.3, 0.3), rand(-0.6, 0.6)))
    } else {
      const h = max.y - min.y
      this.target.set(
        rand(min.x + margin, max.x - margin),
        min.y + h * rand(b.depth[0], b.depth[1]),
        rand(min.z + margin, max.z - margin)
      )
    }

    this.target.x = THREE.MathUtils.clamp(this.target.x, min.x + margin, max.x - margin)
    this.target.y = THREE.MathUtils.clamp(this.target.y, min.y, max.y)
    this.target.z = THREE.MathUtils.clamp(this.target.z, min.z + margin, max.z - margin)

    if (b.bottom) {
      this.target.y = ctx.ground(this.target.x, this.target.z)
      this.rest = Math.random() < 0.55 ? rand(2, 6) : 0
    }

    this.timer = rand(4, 9)
    this.cruise = rand(0.3, 0.8)
  }

  findFood(ctx) {
    const fish = this.fish
    if (fish.hunger < 0.3 || ctx.foods.length === 0) return null

    const b = fish.spec.behavior
    const pos = fish.mesh.position
    let best = null
    let bestDistance = b.sight * b.sight

    for (const food of ctx.foods) {
      if (food.eaten) continue
      if (b.bottom && food.position.y > ctx.ground(food.position.x, food.position.z) + 0.3) continue
      const d = pos.distanceToSquared(food.position)
      if (d < bestDistance) {
        best = food
        bestDistance = d
      }
    }
    return best
  }

  tryEat(food, ctx) {
    const fish = this.fish
    const reach = fish.size * 0.5
    if (fish.mesh.position.distanceToSquared(food.position) > reach * reach) return
    food.eaten = true
    fish.hunger = Math.max(0, fish.hunger - 0.45)
    if (ctx.onEat) ctx.onEat(food, fish)
  }

  flock(ctx, b) {
    const fish = this.fish
    const pos = fish.mesh.position
    const school = b.school
    let count = 0

    center.set(0, 0, 0)
    align.set(0, 0, 0)
    separation.set(0, 0, 0)

    for (const other of ctx.fish) {
      if (other === fish) continue
      tmp.copy(pos).sub(other.mesh.position)
      const d = tmp.length()
      const same = other.spec.id === fish.spec.id
      const radius = school && same ? school.sepRadius : (fish.size + other.size) * 0.6

      if (d < radius && d > 1e-4) separation.addScaledVector(tmp, (1 - d / radius) / d)

      if (school && same && d < school.radius) {
        center.add(other.mesh.position)
        align.add(other.velocity)
        count++
      }
    }

    if (count > 0) {
      center.divideScalar(count).sub(pos)
      acc.addScaledVector(center, school.cohesion)
      align.divideScalar(count).sub(fish.velocity)
      acc.addScaledVector(align, school.align)
    }

    acc.addScaledVector(separation, (school ? school.separation : 1) * b.accel)
  }

  cursor(ctx, b) {
    if (!ctx.ray) return
    const c = b.cursor
    const pos = this.fish.mesh.position
    const ray = ctx.ray

    tmp.copy(pos).sub(ray.origin)
    const t = Math.max(tmp.dot(ray.direction), 0)
    closest.copy(ray.direction).multiplyScalar(t).add(ray.origin)
    tmp.copy(pos).sub(closest)
    const dist = tmp.length()
    if (dist < 1e-4) return
    tmp.divideScalar(dist)

    if (c.mode === 'curious') {
      if (dist < c.fleeRadius) {
        const k = 1 - dist / c.fleeRadius
        acc.addScaledVector(tmp, c.strength * 4 * k)
        this.panic = Math.max(this.panic, k * 0.6)
      } else if (dist < c.radius) {
        acc.addScaledVector(tmp, -c.strength * (1 - dist / c.radius))
      }
      return
    }

    if (dist < c.radius) {
      const k = 1 - dist / c.radius
      acc.addScaledVector(tmp, c.strength * k)
      this.panic = Math.max(this.panic, k)
    }
  }

  bound(ctx, b) {
    const pos = this.fish.mesh.position
    const { min, max } = ctx.bounds
    const margin = 0.6
    const k = b.accel * 2.5

    const push = (value, lo, hi) => {
      if (value < lo + margin) return ((lo + margin - value) / margin) * k
      if (value > hi - margin) return (-(value - (hi - margin)) / margin) * k
      return 0
    }

    acc.x += push(pos.x, min.x, max.x)
    acc.z += push(pos.z, min.z, max.z)

    if (!b.bottom) {
      acc.y += push(pos.y, min.y, max.y)
      const clearance = this.fish.size * 0.4 + 0.12
      const floor = ctx.ground(pos.x, pos.z) + clearance
      if (pos.y < floor) acc.y += (floor - pos.y) * 8
    }
  }

  avoid(ctx) {
    const fish = this.fish
    const pos = fish.mesh.position
    const accel = fish.spec.behavior.accel

    for (const o of ctx.obstacles) {
      tmp.copy(pos).sub(o.center)
      const dist = tmp.length()
      const reach = o.radius + fish.size * 0.45 + 0.12
      if (dist < reach && dist > 1e-4) acc.addScaledVector(tmp, (accel * 3 * (1 - dist / reach)) / dist)
    }
  }

  clamp(ctx, b) {
    const pos = this.fish.mesh.position
    const vel = this.fish.velocity
    const { min, max } = ctx.bounds

    if (pos.x < min.x) { pos.x = min.x; vel.x = Math.abs(vel.x) }
    if (pos.x > max.x) { pos.x = max.x; vel.x = -Math.abs(vel.x) }
    if (pos.z < min.z) { pos.z = min.z; vel.z = Math.abs(vel.z) }
    if (pos.z > max.z) { pos.z = max.z; vel.z = -Math.abs(vel.z) }

    if (!b.bottom) {
      if (pos.y < min.y) { pos.y = min.y; vel.y = Math.abs(vel.y) }
      if (pos.y > max.y) { pos.y = max.y; vel.y = -Math.abs(vel.y) }
    }

    for (const o of ctx.obstacles) {
      tmp.copy(pos).sub(o.center)
      const dist = tmp.length()
      const minimum = o.radius + this.fish.size * 0.3
      if (dist < minimum && dist > 1e-4) pos.copy(o.center).addScaledVector(tmp, minimum / dist)
    }
  }
}
