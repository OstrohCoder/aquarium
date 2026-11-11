import './style.css'
import * as THREE from 'three'
import { Renderer } from './core/Renderer.js'
import { CameraRig } from './core/Camera.js'
import { Loaders } from './core/Loaders.js'
import { Input } from './core/Input.js'
import { Lighting } from './world/Lighting.js'
import { Tank } from './world/Tank.js'
import { Substrate } from './world/Substrate.js'
import { FishSystem } from './fish/FishSystem.js'
import { PhysicsWorld } from './physics/PhysicsWorld.js'
import { FoodSystem } from './world/Food.js'
import { Bubbles } from './world/Bubbles.js'
import { Gui } from './ui/Gui.js'

const canvas = document.querySelector('#scene')

const scene = new THREE.Scene()
const renderer = new Renderer(canvas)
const cameraRig = new CameraRig(canvas, window.innerWidth / window.innerHeight)
const loaders = new Loaders()
const input = new Input(canvas)

cameraRig.camera.position.set(0, 1.9, 8.2)
cameraRig.update()

const lighting = new Lighting(scene, renderer)
const tank = new Tank()
const substrate = new Substrate(loaders)
scene.add(tank.group, substrate.mesh)

const ground = (x, z) => substrate.heightAt(x, z)

const fishSystem = new FishSystem({ bounds: tank.swimBounds, ground })
scene.add(fishSystem.group)
fishSystem.populate()

const physics = new PhysicsWorld(ground)
const foodSystem = new FoodSystem({ physics, foods: fishSystem.foods, ground })
const bubbles = new Bubbles(ground)
scene.add(foodSystem.mesh, bubbles.group)
foodSystem.onEaten = (food) => bubbles.burst(food.position, 2)

input.addEventListener('click', () => {
  foodSystem.dropFromRay(input.getRay(cameraRig.camera))
})

new Gui({ renderer, cameraRig, lighting, fishSystem, foodSystem, bubbles })

function update(dt, elapsed) {
  tank.update(elapsed)
  lighting.update(elapsed)
  physics.step(dt)
  foodSystem.update(dt, elapsed)
  fishSystem.update(dt, input.inside ? input.getRay(cameraRig.camera) : null)
  bubbles.update(dt, elapsed)
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
