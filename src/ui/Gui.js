import GUI from 'lil-gui'
import * as THREE from 'three'
import { waterUniforms } from '../world/WaterShared.js'

export class Gui {
  constructor({ renderer, cameraRig, lighting }) {
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

    this.gui = gui
  }
}
