import * as THREE from 'three'
import { buildFishGeometry } from './FishGeometry.js'
import { createBodyTexture, createFinTexture, createScaleTexture } from './FishTextures.js'
import { injectCaustics } from '../world/Caustics.js'
import swimGLSL from '../shaders/fishSwim.vert.glsl'

function applyFishShader(material, swim) {
  material.onBeforeCompile = (shader) => {
    injectCaustics(shader)
    shader.uniforms.uCycle = swim.uCycle
    shader.uniforms.uAmp = swim.uAmp
    shader.uniforms.uBend = swim.uBend
    shader.uniforms.uFlap = swim.uFlap

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${swimGLSL}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n    transformed = swimDisplace(transformed);')
  }
}

export class FishFactory {
  constructor() {
    this.cache = new Map()
  }

  shared(spec) {
    if (!this.cache.has(spec.id)) {
      this.cache.set(spec.id, {
        geometry: buildFishGeometry(spec),
        body: createBodyTexture(spec.texture),
        fin: createFinTexture(spec.texture),
        scale: createScaleTexture(spec)
      })
    }
    return this.cache.get(spec.id)
  }

  create(spec) {
    const shared = this.shared(spec)
    const m = spec.material

    const swim = {
      uCycle: { value: 0 },
      uAmp: { value: spec.swim.amp },
      uBend: { value: 0 },
      uFlap: { value: spec.swim.flap }
    }

    const body = new THREE.MeshPhysicalMaterial({
      map: shared.body,
      bumpMap: shared.scale,
      bumpScale: m.bump,
      roughness: m.roughness,
      metalness: m.metalness,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3
    })
    if (m.emissive > 0) {
      body.emissive = new THREE.Color('#ffffff')
      body.emissiveMap = shared.body
      body.emissiveIntensity = m.emissive
    }

    const fins = new THREE.MeshStandardMaterial({
      map: shared.fin,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.55,
      alphaTest: 0.02
    })

    const eyeWhite = new THREE.MeshStandardMaterial({ color: '#efe6c8', roughness: 0.25 })
    const pupil = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.05, clearcoat: 1 })

    const materials = [body, fins, eyeWhite, pupil]
    materials.forEach((material) => applyFishShader(material, swim))

    return { geometry: shared.geometry, materials, swim }
  }
}
