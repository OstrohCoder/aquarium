import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { waterUniforms } from './WaterShared.js'

const PRESETS = {
  day: {
    sun: '#fff1d6', sunI: 3.2, sunPos: [2.5, 8, 3.5],
    hemiSky: '#a6eaff', hemiGround: '#0a3b47', hemiI: 0.8,
    fillI: 0.5, rim: '#4fd0ff', rimI: 0.8, env: 0.4,
    shallow: '#3cc8d8', deep: '#05364a', bg: '#04161c', caustics: 0.9
  },
  dusk: {
    sun: '#ffb27a', sunI: 2.2, sunPos: [-5, 3.5, 3],
    hemiSky: '#7a8fd8', hemiGround: '#1b1a3a', hemiI: 0.5,
    fillI: 0.3, rim: '#ff8fb0', rimI: 0.9, env: 0.25,
    shallow: '#3a8fb8', deep: '#1b2250', bg: '#0b0d1f', caustics: 0.6
  },
  night: {
    sun: '#8fb4ff', sunI: 0.6, sunPos: [1, 8, 2],
    hemiSky: '#3a5aa0', hemiGround: '#050a1a', hemiI: 0.25,
    fillI: 0.15, rim: '#3050ff', rimI: 0.5, env: 0.08,
    shallow: '#1c4a78', deep: '#030a1c', bg: '#02040a', caustics: 0.25
  },
  neon: {
    sun: '#ff5fe0', sunI: 1.4, sunPos: [-3, 7, 2],
    hemiSky: '#38f0ff', hemiGround: '#2a0a4a', hemiI: 0.6,
    fillI: 0.3, rim: '#7a5cff', rimI: 1.2, env: 0.2,
    shallow: '#18d6c4', deep: '#2a0a58', bg: '#0a0418', caustics: 1.0
  }
}

export class Lighting {
  constructor(scene, renderer) {
    this.scene = scene
    this.presets = Object.keys(PRESETS)
    this.params = { preset: 'day', brightness: 1, shallow: PRESETS.day.shallow, deep: PRESETS.day.deep }
    this.baseSunIntensity = 1

    const pmrem = new THREE.PMREMGenerator(renderer.instance)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()

    scene.background = new THREE.Color()
    scene.fog = new THREE.FogExp2('#05364a', 0.05)

    this.hemi = new THREE.HemisphereLight()

    this.sun = new THREE.DirectionalLight()
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -4.5
    this.sun.shadow.camera.right = 4.5
    this.sun.shadow.camera.top = 4.5
    this.sun.shadow.camera.bottom = -4.5
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 18
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.02
    this.sun.target.position.set(0, 0.5, 0)

    this.fill = new THREE.DirectionalLight('#ffffff', 0.5)
    this.fill.position.set(0, 2, 9)

    this.rim = new THREE.DirectionalLight()
    this.rim.position.set(0, 3, -6)

    scene.add(this.hemi, this.sun, this.sun.target, this.fill, this.rim)

    this.setPreset('day')
  }

  setPreset(name) {
    const p = PRESETS[name]
    this.params.preset = name
    this.params.shallow = p.shallow
    this.params.deep = p.deep
    this.preset = p
    waterUniforms.uCausticsIntensity.value = p.caustics
    this.apply()
  }

  apply() {
    const p = this.preset
    const b = this.params.brightness

    this.sun.color.set(p.sun)
    this.sun.position.set(...p.sunPos)
    this.baseSunIntensity = p.sunI * b
    this.sun.intensity = this.baseSunIntensity

    this.hemi.color.set(p.hemiSky)
    this.hemi.groundColor.set(p.hemiGround)
    this.hemi.intensity = p.hemiI * b

    this.fill.intensity = p.fillI * b
    this.rim.color.set(p.rim)
    this.rim.intensity = p.rimI * b

    this.scene.environmentIntensity = p.env * b

    waterUniforms.uShallow.value.set(this.params.shallow)
    waterUniforms.uDeep.value.set(this.params.deep)
    waterUniforms.uSunColor.value.set(p.sun)
    waterUniforms.uGodrays.value = Math.min(1, p.sunI / 3.2) * b
    waterUniforms.uSunDir.value.copy(this.sun.position).sub(this.sun.target.position).normalize()
    waterUniforms.uCausticsColor.value.set(p.sun).lerp(new THREE.Color('#bff3ff'), 0.5)

    this.scene.fog.color.copy(waterUniforms.uDeep.value)
    this.scene.background.set(p.bg)
  }

  update(elapsed) {
    this.sun.intensity = this.baseSunIntensity * (1 + 0.04 * Math.sin(elapsed * 1.7) + 0.02 * Math.sin(elapsed * 3.1))
  }
}
