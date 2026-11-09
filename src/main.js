import './style.css'
import * as THREE from 'three'
import { TANK } from './config.js'
import { Renderer } from './core/Renderer.js'
import { CameraRig } from './core/Camera.js'
import { Loaders } from './core/Loaders.js'
import { Input } from './core/Input.js'
import { Gui } from './ui/Gui.js'

const canvas = document.querySelector('#scene')

const scene = new THREE.Scene()
scene.background = new THREE.Color('#031a22')

const renderer = new Renderer(canvas)
const cameraRig = new CameraRig(canvas, window.innerWidth / window.innerHeight)
const loaders = new Loaders()
const input = new Input(canvas)
new Gui({ renderer, cameraRig })

const hemi = new THREE.HemisphereLight('#9fe7ff', '#0b2a33', 0.7)
scene.add(hemi)

const sun = new THREE.DirectionalLight('#ffffff', 2.4)
sun.position.set(2, 6, 3)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -5
sun.shadow.camera.right = 5
sun.shadow.camera.top = 5
sun.shadow.camera.bottom = -5
sun.shadow.bias = -0.0005
scene.add(sun)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(TANK.width, TANK.depth),
  new THREE.MeshStandardMaterial({ color: '#c9b283', roughness: 0.95 })
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

const tankOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.width, TANK.height, TANK.depth)),
  new THREE.LineBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: 0.5 })
)
tankOutline.position.y = TANK.height / 2
scene.add(tankOutline)

const probe = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 48, 24),
  new THREE.MeshStandardMaterial({ color: '#ff8a3d', roughness: 0.35, metalness: 0.1 })
)
probe.castShadow = true
probe.position.set(0, 0.5, 0)
scene.add(probe)

input.addEventListener('click', () => {
  const hit = input.intersectObjects([floor], cameraRig.camera)[0]
  if (hit) probe.userData.target = hit.point.clone()
})

function update(dt, elapsed) {
  const t = probe.userData.target
  if (t) probe.position.x += (t.x - probe.position.x) * Math.min(dt * 4, 1)
  if (t) probe.position.z += (t.z - probe.position.z) * Math.min(dt * 4, 1)
  probe.position.y = 0.5 + Math.sin(elapsed * 2) * 0.08
}

let last = performance.now()
const start = last

function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  update(dt, (now - start) / 1000)
  cameraRig.update()
  renderer.render(scene, cameraRig.camera)

  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight)
  cameraRig.resize(window.innerWidth / window.innerHeight)
})

loaders.done()
