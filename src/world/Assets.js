import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyCaustics } from './Caustics.js'

const loader = new GLTFLoader()

export const assets = { trunk: null, grass: null }

async function load(name, { axis, size, caustics }) {
  try {
    const gltf = await loader.loadAsync(`/models/${name}/${name}_1k.gltf`)
    gltf.scene.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(gltf.scene)
    const dims = box.getSize(new THREE.Vector3())
    const k = size / (axis === 'y' ? dims.y : Math.max(dims.x, dims.y, dims.z))
    const normalize = new THREE.Matrix4()
      .makeScale(k, k, k)
      .multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2))

    const parts = []
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return
      const geometry = o.geometry.clone()
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, o.matrixWorld))
      geometry.userData.shared = true
      const material = (Array.isArray(o.material) ? o.material[0] : o.material).clone()
      if (caustics) applyCaustics(material)
      parts.push({ geometry, material })
    })

    return { parts, size: dims.multiplyScalar(k) }
  } catch (e) {
    console.warn(`Не завантажилась модель ${name}`, e)
    return null
  }
}

export async function loadAssets() {
  const [trunk, grass] = await Promise.all([
    load('dead_tree_trunk_02', { axis: 'max', size: 1.8, caustics: true }),
    load('grass_medium_02', { axis: 'y', size: 1, caustics: false })
  ])
  assets.trunk = trunk
  assets.grass = grass
}
