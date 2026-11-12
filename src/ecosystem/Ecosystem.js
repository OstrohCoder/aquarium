import * as THREE from 'three'
import { SPECIES } from '../fish/Species.js'
import { waterUniforms } from '../world/WaterShared.js'

const COMFORT = {
  neon: { temp: [22, 27], clean: 45 },
  goldfish: { temp: [18, 24], clean: 40 },
  angelfish: { temp: [24, 29], clean: 55 },
  catfish: { temp: [22, 27], clean: 35 }
}

export class Ecosystem {
  constructor({ fishSystem, foodSystem }) {
    this.fishSystem = fishSystem
    this.foodSystem = foodSystem
    this.params = { filter: 0.6, heater: 24, speed: 1 }
    this.state = { pollution: 12, temperature: 24 }
    this.ambient = 22
    this.onEvent = null

    foodSystem.onRot = () => {
      this.state.pollution = Math.min(100, this.state.pollution + 1.5)
    }
  }

  get cleanliness() {
    return 100 - this.state.pollution
  }

  get alive() {
    return this.fishSystem.fish.filter((fish) => !fish.dead)
  }

  get averageHealth() {
    const alive = this.alive
    if (alive.length === 0) return 0
    return alive.reduce((sum, fish) => sum + fish.health, 0) / alive.length
  }

  get foodCount() {
    return this.foodSystem.items.length
  }

  emit(text) {
    if (this.onEvent) this.onEvent(text)
  }

  waterChange() {
    this.state.pollution = Math.max(0, this.state.pollution - 40)
    this.state.temperature += (this.ambient - this.state.temperature) * 0.3
    this.emit('Підміна води виконана')
  }

  stress(fish, temperature, cleanliness) {
    const comfort = COMFORT[fish.spec.id]
    let stress = 0

    if (temperature < comfort.temp[0]) stress += (comfort.temp[0] - temperature) * 0.12
    if (temperature > comfort.temp[1]) stress += (temperature - comfort.temp[1]) * 0.12
    if (cleanliness < comfort.clean) stress += (comfort.clean - cleanliness) * 0.02
    if (fish.hunger > 0.85) stress += (fish.hunger - 0.85) * 3

    return stress
  }

  update(dt) {
    const step = dt * this.params.speed
    const state = this.state
    const alive = this.alive

    const load = alive.length * 0.0025
    state.pollution = THREE.MathUtils.clamp(state.pollution + (load - this.params.filter * 0.09) * step, 0, 100)
    state.temperature += (this.params.heater - state.temperature) * (1 - Math.exp(-step * 0.02))

    const speedScale = THREE.MathUtils.clamp(0.7 + (0.6 * (state.temperature - 18)) / 12, 0.6, 1.4)
    const ctx = this.fishSystem.ctx
    ctx.speedScale = speedScale
    ctx.hungerRate = 0.003 * speedScale * this.params.speed

    for (const fish of alive) {
      const stress = this.stress(fish, state.temperature, this.cleanliness)
      fish.setHealth(fish.health + (stress > 0 ? -stress : 0.5) * step)

      if (fish.health <= 0) {
        fish.die()
        state.pollution = Math.min(100, state.pollution + 4)
        this.emit(`${SPECIES[fish.spec.id].name} загинула`)
      }
    }

    waterUniforms.uMurk.value = THREE.MathUtils.clamp((state.pollution - 25) / 75, 0, 1)
  }
}
