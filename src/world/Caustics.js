import { waterUniforms } from './WaterShared.js'
import causticsGLSL from '../shaders/caustics.frag.glsl'

export function injectCaustics(shader) {
  shader.uniforms.uTime = waterUniforms.uTime
  shader.uniforms.uWaterHeight = waterUniforms.uWaterHeight
  shader.uniforms.uCausticsIntensity = waterUniforms.uCausticsIntensity
  shader.uniforms.uCausticsColor = waterUniforms.uCausticsColor

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vCWorld;\nvarying vec3 vCNormal;'
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 cw = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
      cw = instanceMatrix * cw;
      #endif
      vCWorld = (modelMatrix * cw).xyz;
      vCNormal = normalize(mat3(modelMatrix) * objectNormal);`
    )

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uTime;
      uniform float uWaterHeight;
      uniform float uCausticsIntensity;
      uniform vec3 uCausticsColor;
      varying vec3 vCWorld;
      varying vec3 vCNormal;
      ${causticsGLSL}`
    )
    .replace(
      '#include <opaque_fragment>',
      `float cA = causticsPattern(vCWorld.xz * 0.22, uTime * 0.6);
      float cB = causticsPattern(vCWorld.xz * 0.35 + 3.7, uTime * 0.45 + 11.0);
      float cs = cA * 0.6 + cB * 0.4;
      float up = clamp(normalize(vCNormal).y * 0.5 + 0.5, 0.0, 1.0);
      float depthFade = 1.0 - 0.55 * clamp((uWaterHeight - vCWorld.y) / uWaterHeight, 0.0, 1.0);
      float inWater = step(vCWorld.y, uWaterHeight);
      outgoingLight += diffuseColor.rgb * cs * uCausticsIntensity * uCausticsColor * up * up * depthFade * inWater;
      #include <opaque_fragment>`
    )
}

export function applyCaustics(material) {
  material.onBeforeCompile = (shader) => injectCaustics(shader)
}
