import GUI from 'lil-gui'
import * as THREE from 'three'

export class Gui {
  constructor({ renderer, cameraRig }) {
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

    this.gui = gui
  }
}
