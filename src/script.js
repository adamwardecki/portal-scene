import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import firefliesVertexShader from './shaders/fireflies/vertex.glsl'
import firefliesFragmentShader from './shaders/fireflies/fragment.glsl'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'
import volumetricFireFactory from './fire/volumetricFire.js'

/**
 * Base
 */
const debugObject = {}
// Debug
const gui = new dat.GUI({
    width: 400
})

const isLocalhost = window.location.href.includes('localhost')

gui.show(isLocalhost)
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Don't allow the camera to go below the ground
controls.maxPolarAngle = Math.PI / 2  - Math.PI / 32

/**
 * Textures
 */
const bakedTexture = textureLoader.load('BakedDark.jpg')


/**
 * Materials
 */
const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

bakedTexture.flipY = false
bakedTexture.colorSpace = THREE.SRGBColorSpace

// Replacing the original emission material with a "window glass" material
const poleLightMaterial = new THREE.MeshBasicMaterial({
    color: 0x6b89ff,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
})

debugObject.portalColorStart = '#000000'
debugObject.portalColorEnd = '#bb00ff'

gui
    .addColor(debugObject, 'portalColorStart')
    .onChange(() => {
        portalLightMaterial.uniforms.uColorStart.value.set(debugObject.portalColorStart)
    })

gui
    .addColor(debugObject, 'portalColorEnd')
    .onChange(() => {
        portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd)
    })

const portalLightMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(0x000000) },
        uColorEnd: { value: new THREE.Color(0xb358fe) },
    },
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
    side: THREE.DoubleSide,
})


const lightStandMaterial = new THREE.MeshStandardMaterial({
    color: 0xc2c2c2,
    metalness: 0.8,
    roughness: 0.1,
    emissive: 0x000000,
})

/**
 * Lantern Fire
 */
const fireWidth = 1;
const fireHeight = 2;
const fireDepth = 1;
const sliceSpacing = 0.5;

const VolumetricFire = volumetricFireFactory();

const fireOne = new VolumetricFire(
    fireWidth,
    fireHeight,
    fireDepth,
    sliceSpacing,
    camera
)

const fireTwo = new VolumetricFire(
    fireWidth,
    fireHeight,
    fireDepth,
    sliceSpacing,
    camera
)

fireOne.mesh.scale.set(0.1, 0.1, 0.1)
fireTwo.mesh.scale.set(0.1, 0.1, 0.1)

scene.add(fireOne.mesh);
scene.add(fireTwo.mesh);

/**
 * Model
 */
gltfLoader.load(
    'portal3.glb',
    (gltf) => {
        gltf.scene.traverse((child) => {
            child.material = bakedMaterial
            // Double side for the pole lights lanterns which have transparent parts
            child.material.side = THREE.DoubleSide
        })

        const poleLight1 = gltf.scene.children.find(child => child.name === 'Light_Inside001')
        const poleLight2 = gltf.scene.children.find(child => child.name === 'Light_Inside003')

        poleLight1.material = poleLightMaterial
        poleLight2.material = poleLightMaterial

        const lightStand1 = gltf.scene.children.find(child => child.name === 'LightStand01')
        const lightStand2 = gltf.scene.children.find(child => child.name === 'LightStand02')

        lightStand1.material = lightStandMaterial
        lightStand2.material = lightStandMaterial

        gltf.scene.children.find(child => child.name === 'Circle').material = portalLightMaterial

        scene.add(gltf.scene)

        fireOne.mesh.position.copy(lightStand1.position)
        fireOne.mesh.position.y += 0.11

        fireTwo.mesh.position.copy(lightStand2.position)
        fireTwo.mesh.position.y += 0.11
    }
)

/**
 * Fireflies
 */
const firefliesGeometry = new THREE.BufferGeometry()
const firefliesCount = 30
const positionArray = new Float32Array(firefliesCount * 3)
const scaleArray = new Float32Array(firefliesCount)

for (let i = 0; i < firefliesCount; i++) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4
    positionArray[i * 3 + 1] = Math.random() * 2
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4

    scaleArray[i] = Math.random()
}

firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1))

const firefliesMaterial = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexShader: firefliesVertexShader,
    fragmentShader: firefliesFragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 90 }
    },
    depthWrite: false
})

gui.add(firefliesMaterial.uniforms.uSize, 'value').min(0).max(100).step(0.001).name('firefliesSize')

const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial)
scene.add(fireflies)


window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update fireflies
    firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
})

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


debugObject.clearColor = '#0d0614'
renderer.setClearColor(debugObject.clearColor)

gui.addColor(debugObject, 'clearColor').onChange(() => {
    renderer.setClearColor(debugObject.clearColor)
})


/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update fireflies
    firefliesMaterial.uniforms.uTime.value = elapsedTime

    // Update portalLight
    portalLightMaterial.uniforms.uTime.value = elapsedTime
    // Update controls
    controls.update()

    fireOne.update(elapsedTime);
    fireTwo.update(elapsedTime);

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()