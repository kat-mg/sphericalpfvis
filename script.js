import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* Functions */
const toRadians = (degrees) => degrees * Math.PI / 180

const latlongToCartesian = (latitude, longitude, radius) => {
    const lat = toRadians(latitude)
    const long = toRadians(longitude)

    const x = radius * Math.cos(lat) * Math.cos(long)
    const y = radius * Math.cos(lat) * Math.sin(long)
    const z = radius * Math.sin(lat)

    return [x, y, z]
}

/* Data */
const meshData = {
    vertices: [
        [90, 0], [1, -180], [0, -90], [0, 0], [-1, 90], [-90, 0]
    ],
    faces: [
        [0, 1, 2], [0, 3, 4], [0, 4, 1],
        [1, 5, 2], [2, 5, 3], [3, 5, 4], [4, 5, 1]
    ]
};

/* Scene */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene();

// Sphere Object
const geometrySphere = new THREE.SphereGeometry(1, 32, 32);
const materialSphere = new THREE.MeshBasicMaterial({ color: 0x0b5208, transparent: true, opacity: 0.3, wireframe: true });
const meshSphere = new THREE.Mesh(geometrySphere, materialSphere);
scene.add(meshSphere);

// Particles Object
const particleGeometry = new THREE.BufferGeometry();
const particleCount = meshData.vertices.length;
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
    console.log(i, meshData.vertices[i]);                       // For testing purposes
    const lat = meshData.vertices[i][0];
    const long = meshData.vertices[i][1];
    const [x, y, z] = latlongToCartesian(lat, long, 1);
    meshData.vertices[i] = [x, y, z];
    console.log(meshData.vertices[i]);                       // For testing purposes
}

for (let i = 0; i < particleCount; i++) {
    console.log(meshData.vertices[i]);
    particlePositions[i * 3] = meshData.vertices[i][0];
    particlePositions[i * 3 + 1] = meshData.vertices[i][1];
    particlePositions[i * 3 + 2] = meshData.vertices[i][2];
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial();
particleMaterial.size = 0.03;
particleMaterial.sizeAttenuation = true;
particleMaterial.wireframe = true;
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Lines TODO
const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(meshData.vertices[0][0], meshData.vertices[0][1], meshData.vertices[0][2]),
    new THREE.Vector3(meshData.vertices[1][0], meshData.vertices[1][1], meshData.vertices[1][2]),
    new THREE.Vector3(meshData.vertices[2][0], meshData.vertices[2][1], meshData.vertices[2][2])
]);


const points = curve.getPoints( 100 );
const geometry = new THREE.BufferGeometry().setFromPoints( points );

const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );

// Create the final object to add to the scene
const curveObject = new THREE.Line( geometry, material );
scene.add(curveObject);


/* Sizes */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/* Camera */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/* Renderer */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* Animate */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()