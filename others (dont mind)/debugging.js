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

function createSphericalCurve(pointA, pointB, radius, segments = 100) {
    const v0 = new THREE.Vector3(pointA[0], pointA[1], pointA[2]).normalize();
    const v1 = new THREE.Vector3(pointB[0], pointB[1], pointB[2]).normalize();

    const curvePoints = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const interpolated = new THREE.Vector3().lerpVectors(v0, v1, t).normalize().multiplyScalar(radius);
        curvePoints.push(interpolated);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geometry, material);
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
let noLines = 0;
const lines = [];
for (let i = 0; i < meshData.faces.length; i++) {
    console.log("Polygon:", i);
    for (let j = 0; j < meshData.faces[i].length - 1; j++) {
        const currVertex = meshData.vertices[meshData.faces[i][j]];
        let connectTo = meshData.vertices[meshData.faces[i][j + 1]];

        console.log(meshData.faces[i][j], currVertex, "is gonna be connected to", meshData.faces[i][j + 1], connectTo);         // For debugging purposes

        const line = createSphericalCurve(currVertex, connectTo, 1);
        lines.push(line);
        noLines++;
    }
}
console.log(noLines);           // For debugging purposes

let currentLineIndex = 0;

function addNextLine() {
    if (currentLineIndex < lines.length) {
        scene.add(lines[currentLineIndex]);
        console.log("Line added:", lines[currentLineIndex]);           // For debugging purposes
        currentLineIndex++;
        setTimeout(addNextLine, 2000); // Add the next line after 2 seconds
    }
}

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
addNextLine(); // Start adding lines with a delay