import * as THREE from 'three'
import { WATER_HEIGHT } from '../config.js'

export const waterUniforms = {
  uTime: { value: 0 },
  uWaterHeight: { value: WATER_HEIGHT },
  uShallow: { value: new THREE.Color('#3cc8d8') },
  uDeep: { value: new THREE.Color('#05364a') },
  uOpacity: { value: 0.3 },
  uSunDir: { value: new THREE.Vector3(0.3, 1, 0.4).normalize() },
  uSunColor: { value: new THREE.Color('#ffffff') },
  uCausticsIntensity: { value: 0.9 },
  uCausticsColor: { value: new THREE.Color('#d6f6ff') },
  uMurk: { value: 0 },
  uMurkColor: { value: new THREE.Color('#5f7233') },
  uGodrays: { value: 1 }
}

export function withOutputChunks(source) {
  return source.replace(
    '__OUTPUT__',
    '#include <tonemapping_fragment>\n#include <colorspace_fragment>'
  )
}
