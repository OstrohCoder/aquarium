import * as THREE from 'three'
import { SPECIES } from './Species.js'
import { FishFactory } from './FishFactory.js'
import { Fish } from './Fish.js'

const rand = THREE.MathUtils.randFloat

export class FishSystem {
  constructor({ bounds, ground }) {
    this.group = new THREE.Group()
    this.bounds = bounds
    this.ground = ground
    this.factory = new FishFactory()
    this.fish = []
    this.groups = new Map()
    this.foods = []

    this.ctx = {
      bounds,
      ground,
      fish: this.fish,
      foods: this.foods,
      groups: this.groups,
      ray: null,
      hungerRate: 0.012,
      onEat: null
    }
  }

  populate() {
    Object.values(SPECIES).forEach((spec) => {
      for (let i = 0; i < spec.count; i++) this.add(spec.id)
    })
  }

  randomTarget(spec) {
    const { min, max } = this.bounds
    const [a, b] = spec.behavior.depth
    const h = max.y - min.y
    return new THREE.Vector3(
      rand(min.x + 0.8, max.x - 0.8),
      min.y + h * rand(a, b),
      rand(min.z + 0.5, max.z - 0.5)
    )
  }

  groupFor(spec) {
    if (!this.groups.has(spec.id)) {
      this.groups.set(spec.id, { target: this.randomTarget(spec), timer: rand(6, 12) })
    }
    return this.groups.get(spec.id)
  }

  add(id) {
    const spec = SPECIES[id]
    const { min, max } = this.bounds
    const position = new THREE.Vector3()

    if (spec.behavior.school) {
      position.copy(this.groupFor(spec).target).add(new THREE.Vector3(rand(-0.5, 0.5), rand(-0.3, 0.3), rand(-0.5, 0.5)))
    } else {
      position.copy(this.randomTarget(spec))
    }

    position.x = THREE.MathUtils.clamp(position.x, min.x + 0.3, max.x - 0.3)
    position.z = THREE.MathUtils.clamp(position.z, min.z + 0.3, max.z - 0.3)
    position.y = spec.behavior.bottom
      ? this.ground(position.x, position.z) + spec.length * 0.1
      : Math.max(position.y, this.ground(position.x, position.z) + 0.3)

    const fish = new Fish(spec, this.factory, position)
    this.fish.push(fish)
    this.group.add(fish.mesh)
    return fish
  }

  remove(id) {
    for (let i = this.fish.length - 1; i >= 0; i--) {
      if (this.fish[i].spec.id === id) {
        const [fish] = this.fish.splice(i, 1)
        this.group.remove(fish.mesh)
        fish.dispose()
        return
      }
    }
  }

  count(id) {
    return this.fish.filter((fish) => fish.spec.id === id).length
  }

  update(dt, ray) {
    for (const [id, group] of this.groups) {
      group.timer -= dt
      if (group.timer <= 0) {
        group.target.copy(this.randomTarget(SPECIES[id]))
        group.timer = rand(6, 12)
      }
    }

    this.ctx.ray = ray
    for (const fish of this.fish) fish.update(dt, this.ctx)
  }
}
