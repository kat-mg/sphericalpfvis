import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { label } from 'three/tsl';

/* Functions */
const toRadians = (degrees) => degrees * Math.PI / 180;

const latlongToCartesian = (latitude, longitude, radius) => {
    const lat = toRadians(latitude);
    const long = toRadians(longitude);

    let x = radius * Math.cos(lat) * Math.cos(long);
    let y = radius * Math.cos(lat) * Math.sin(long);
    let z = radius * Math.sin(lat);

    const epsilon = 0.0000000000000001;
    if (Math.abs(x) < epsilon) x = 0;
    if (Math.abs(y) < epsilon) y = 0;
    if (Math.abs(z) < epsilon) z = 0;

    return [x, y, z];
}

function createSphericalCurve(pointA, pointB, radius, lineColor, add = 0, segments = 100) {
    const v0 = new THREE.Vector3(pointA[0], pointA[1], pointA[2]).normalize();
    const v1 = new THREE.Vector3(pointB[0], pointB[1], pointB[2]).normalize();

    const curvePoints = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const interpolated = new THREE.Vector3().lerpVectors(v0, v1, t).normalize().multiplyScalar(radius + add);
        curvePoints.push(interpolated);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    let material = new THREE.LineBasicMaterial({ color: lineColor });
    return [new THREE.Line(geometry, material), curvePoints];
}

/* Data */
THREE.Cache.enabled = true;
const fileLoader = new THREE.FileLoader();

function loadMesh() {
    return new Promise((resolve, reject) => {
        let meshData = { vertices: [], faces: [] };

        fileLoader.load('./mesh files/sphere1.sph', 
            function (data) {
                const lines = data.split('\n');
                const line1 = lines[1].split(' ');
                const noVertices = parseInt(line1[0]);
                for (let i = 2; i < lines.length; i++) {
                    const line = lines[i].split(' ');
                    if (i - 2 < noVertices) {
                        meshData.vertices.push([parseFloat(line[0]), parseFloat(line[1])]);
                    }
                    else {
                        const noSides = parseInt(line[0]);
                        let thisFace = [];
                        for (let j = 0; j < noSides; j++) {
                            thisFace.push(parseInt(line[1 + j]));
                        }
                        meshData.faces.push(thisFace);
                    }
                }
                resolve(meshData);
            },
            function (xhr) { 
                console.log("Load File Progress!");
            },
            function (error) {
                reject(error);
            }
        );
    });
}

function loadResult() {
    return new Promise((resolve, reject) => {
        let resultData = [];

        fileLoader.load('./result files/sphere1res.txt',
            function (data) {
                const lines = data.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].split(' ');
                    const lat = parseFloat(line[0]);  
                    const long = parseFloat(line[1]);
                    const [x, y, z] = latlongToCartesian(lat, long, 1);
                    resultData.push([x, y, z]);
                }
                resolve(resultData);
            },
            function (xhr) {
                console.log("Load File Progress!");
            },
            function (error) {
                reject(error);
            }
        );
    })
}

async function init() {
    const meshData = await loadMesh();
    /* Scene */
    // Canvas
    const canvas = document.querySelector('canvas.webgl');

    // Scene
    const scene = new THREE.Scene();

    // Sphere Object
    const geometrySphere = new THREE.SphereGeometry(1, 32, 32);
    const materialSphere = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5});
    const meshSphere = new THREE.Mesh(geometrySphere, materialSphere);
    //scene.add(meshSphere);

    // Particles Object
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = meshData.vertices.length;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const lat = meshData.vertices[i][0];
        const long = meshData.vertices[i][1];
        const [x, y, z] = latlongToCartesian(lat, long, 1);
        meshData.vertices[i] = [x, y, z];
    }

    for (let i = 0; i < particleCount; i++) {
        const particleDiv = document.createElement('div');
        particleDiv.className = 'label';
        particleDiv.textContent = `P${i}`;
        particleDiv.style.color = 'white';
        const particleLabel = new CSS2DObject(particleDiv);
        particleLabel.position.set(meshData.vertices[i][0], meshData.vertices[i][1], meshData.vertices[i][2]);
        scene.add(particleLabel);

        particlePositions[i * 3] = meshData.vertices[i][0];
        particlePositions[i * 3 + 1] = meshData.vertices[i][1];
        particlePositions[i * 3 + 2] = meshData.vertices[i][2];
    } // could probably optimize this by using a single loop, but this is fine for now

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial();
    particleMaterial.size = 0.03;
    particleMaterial.sizeAttenuation = true;
    particleMaterial.wireframe = false;
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Lines
    for (let i = 0; i < meshData.faces.length; i++) {
        let linePoints = [];
        for (let j = 0; j < meshData.faces[i].length; j++) {
            let currVertex, connectTo;
            if (j === meshData.faces[i].length - 1) {
                currVertex = meshData.vertices[meshData.faces[i][j]];
                connectTo = meshData.vertices[meshData.faces[i][0]];
            }
            else {
                currVertex = meshData.vertices[meshData.faces[i][j]];
                connectTo = meshData.vertices[meshData.faces[i][j + 1]];
            }

            const line = createSphericalCurve(currVertex, connectTo, 1, 0xFFFF00, 0.03);
            scene.add(line[0]);

            if (j === meshData.faces[i].length - 1) {
                linePoints = linePoints.flat();
                for (let k = 0; k < linePoints.length; k++) {
                    const linePoint = [linePoints[k].x, linePoints[k].y, linePoints[k].z];
                    const line2 = createSphericalCurve(currVertex, linePoint, 1, 0x0b5208);
                    scene.add(line2[0]);
                }
            }
            else if (j === meshData.faces[i].length - 2) {
                continue;
            }
            else {
                linePoints.push(line[1]); // no need for this for the last node
            }
        }
        linePoints = [];
    }

    // Results
    const resultData = await loadResult();
    for (let i = 0; i < resultData.length; i++) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'label';
        resultDiv.textContent = `R${i}`;
        resultDiv.style.color = 'white';
        const resultLabel = new CSS2DObject(resultDiv);
        resultLabel.position.set(resultData[i][0], resultData[i][1], resultData[i][2]);
        scene.add(resultLabel); // can make this into a function (these codes are repetitive)

        const pointSphereGeom = new THREE.SphereGeometry(0.02, 32, 32);
        const pointSphereMat = new THREE.MeshBasicMaterial({ color: 0x916248 });
        const pointSphere = new THREE.Mesh(pointSphereGeom, pointSphereMat);
        pointSphere.position.set(resultData[i][0], resultData[i][1], resultData[i][2]);
        scene.add(pointSphere);
        
        if (i !== resultData.length - 1) {
            const line = createSphericalCurve(resultData[i], resultData[i + 1], 1);
            scene.add(line[0]);
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
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;

        // Update camera
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();

        // Update renderer
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    /* Camera */
    // Base camera
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.z = 3;
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const css2DRenderer = new CSS2DRenderer();
    css2DRenderer.setSize(sizes.width, sizes.height);
    css2DRenderer.domElement.style.position = 'absolute';
    css2DRenderer.domElement.style.top = '0px';
    css2DRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(css2DRenderer.domElement);

    /* Animate */
    const clock = new THREE.Clock();

    const tick = () =>
    {
        const elapsedTime = clock.getElapsedTime();

        // Update controls
        controls.update();

        // Render
        renderer.render(scene, camera);
        css2DRenderer.render(scene, camera); // Render labels using CSS2DRenderer

        // Call tick again on the next frame
        window.requestAnimationFrame(tick);
    }

    tick();
}

init();