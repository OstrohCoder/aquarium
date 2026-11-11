import GUI from 'lil-gui'
import * as THREE from 'three'
import { waterUniforms } from '../world/WaterShared.js'
import { SPECIES } from '../fish/Species.js'

export class Gui {
  constructor({ renderer, cameraRig, lighting, fishSystem, foodSystem, bubbles }) {
    const gui = new GUI({ title: 'Акваріум' })
    const r = renderer.instance

    const render = gui.addFolder('Рендер')
    render.add(r, 'toneMapping', {
      No: THREE.NoToneMapping,
      Linear: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Cineon: THREE.CineonToneMapping,
      ACESFilmic: THREE.ACESFilmicToneMapping,
      AgX: THREE.AgXToneMapping,
      Neutral: THREE.NeutralToneMapping
    }).name('Tone mapping')
    render.add(r, 'toneMappingExposure', 0, 3, 0.01).name('Експозиція')

    const cam = gui.addFolder('Камера')
    cam.add({ free: false }, 'free').name('Вільна камера')
      .onChange((v) => cameraRig.setFree(v))

    const light = gui.addFolder('Освітлення і вода')
    light.add(lighting.params, 'preset', lighting.presets).name('Пресет')
      .onChange((v) => {
        lighting.setPreset(v)
        light.controllersRecursive().forEach((c) => c.updateDisplay())
      })
    light.add(lighting.params, 'brightness', 0, 2, 0.01).name('Яскравість')
      .onChange(() => lighting.apply())
    light.addColor(lighting.params, 'shallow').name('Колір води (верх)')
      .onChange(() => lighting.apply())
    light.addColor(lighting.params, 'deep').name('Колір води (низ)')
      .onChange(() => lighting.apply())
    light.add(waterUniforms.uOpacity, 'value', 0, 0.8, 0.01).name('Каламутність')
    light.add(waterUniforms.uCausticsIntensity, 'value', 0, 3, 0.01).name('Каустики')


    const fishFolder = gui.addFolder('Мешканці')
    const counts = {}
    const refresh = () => Object.keys(SPECIES).forEach((id) => (counts[id] = fishSystem.count(id)))
    refresh()
    Object.values(SPECIES).forEach((spec) => {
      fishFolder.add(counts, spec.id).name(spec.name).listen().disable()
      fishFolder.add({ add: () => { fishSystem.add(spec.id); refresh() } }, 'add').name(`+ ${spec.name}`)
      fishFolder.add({ remove: () => { fishSystem.remove(spec.id); refresh() } }, 'remove').name(`− ${spec.name}`)
    })

    const feed = gui.addFolder('Годування і повітря')
    feed.add({ feed: () => foodSystem.dropRandom() }, 'feed').name('Покормити')
    feed.add(foodSystem.params, 'amount', 1, 30, 1).name('Гранул за раз')
    feed.add(bubbles.params, 'rate', 0, 30, 1).name('Бульбашки / с')

    this.gui = gui
  }
}
