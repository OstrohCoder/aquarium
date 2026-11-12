import { SPECIES } from '../fish/Species.js'

export class Hud {
  constructor({ ecosystem, fishSystem, input, cameraRig }) {
    this.ecosystem = ecosystem
    this.fishSystem = fishSystem
    this.input = input
    this.cameraRig = cameraRig
    this.accum = 0

    this.root = document.createElement('div')
    this.root.id = 'stats'
    this.root.innerHTML = `
      <div class="row"><span>Чистота води</span><b data-v="clean"></b></div>
      <div class="bar"><u data-b="clean"></u></div>
      <div class="row"><span>Здоров'я мешканців</span><b data-v="health"></b></div>
      <div class="bar"><u data-b="health"></u></div>
      <div class="row"><span>Температура</span><b data-v="temp"></b></div>
      <div class="row"><span>Корм у воді</span><b data-v="food"></b></div>
      <div class="row"><span>Мешканців</span><b data-v="count"></b></div>
      <div class="notice" data-v="notice"></div>
    `

    this.tip = document.createElement('div')
    this.tip.id = 'tip'

    document.body.append(this.root, this.tip)

    this.value = (key) => this.root.querySelector(`[data-v="${key}"]`)
    this.bar = (key) => this.root.querySelector(`[data-b="${key}"]`)
    this.noticeTimer = 0

    ecosystem.onEvent = (text) => {
      this.value('notice').textContent = text
      this.noticeTimer = 6
    }
  }

  level(percent) {
    if (percent > 60) return '#4fd86a'
    if (percent > 30) return '#f0c040'
    return '#f0584a'
  }

  setBar(key, percent) {
    const bar = this.bar(key)
    bar.style.width = `${Math.max(0, Math.min(100, percent))}%`
    bar.style.background = this.level(percent)
  }

  update(dt) {
    this.noticeTimer = Math.max(0, this.noticeTimer - dt)
    if (this.noticeTimer === 0) this.value('notice').textContent = ''

    this.accum += dt
    if (this.accum < 0.2) return
    this.accum = 0

    const eco = this.ecosystem
    const clean = eco.cleanliness
    const health = eco.averageHealth

    this.value('clean').textContent = `${clean.toFixed(0)} %`
    this.value('health').textContent = `${health.toFixed(0)} %`
    this.value('temp').textContent = `${eco.state.temperature.toFixed(1)} °C`
    this.value('food').textContent = `${eco.foodCount}`
    this.value('count').textContent = `${eco.alive.length}`
    this.setBar('clean', clean)
    this.setBar('health', health)

    this.hover()
  }

  hover() {
    if (!this.input.inside) {
      this.tip.style.display = 'none'
      return
    }

    const meshes = this.fishSystem.fish.map((fish) => fish.mesh)
    const hit = this.input.intersectObjects(meshes, this.cameraRig.camera, false)[0]
    const fish = hit && this.fishSystem.fish.find((f) => f.mesh === hit.object)

    if (!fish) {
      this.tip.style.display = 'none'
      return
    }

    const pointer = this.input.pointer
    this.tip.style.display = 'block'
    this.tip.style.left = `${(pointer.x * 0.5 + 0.5) * window.innerWidth + 14}px`
    this.tip.style.top = `${(-pointer.y * 0.5 + 0.5) * window.innerHeight + 14}px`
    this.tip.textContent = fish.dead
      ? `${SPECIES[fish.spec.id].name} · загинула`
      : `${SPECIES[fish.spec.id].name} · здоров'я ${fish.health.toFixed(0)} % · голод ${(fish.hunger * 100).toFixed(0)} %`
  }
}
