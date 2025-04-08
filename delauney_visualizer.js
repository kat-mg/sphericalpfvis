import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {geoDelaunay} from "https://cdn.skypack.dev/d3-geo-voronoi@2";

/* Functions */
const toRadians = (degrees) => degrees * Math.PI / 180;
const toDegrees = (radians) => radians / Math.PI * 180;

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

function createSphericalCurve(pointA, pointB, radius, lineColor, add = 0, segments = 100, result = false) {
    const v0 = new THREE.Vector3(pointA[0], pointA[1], pointA[2]).normalize();
    const v1 = new THREE.Vector3(pointB[0], pointB[1], pointB[2]).normalize();

    const curvePoints = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const interpolated = new THREE.Vector3().lerpVectors(v0, v1, t).normalize().multiplyScalar(radius + add);
        curvePoints.push(interpolated);
    }

    if (result) {
        // to do(?)
    } else {
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        let material = new THREE.LineBasicMaterial({ color: lineColor });
        return [new THREE.Line(geometry, material), curvePoints];
    }
}

function createSphericalTriangle(points, edgeVertices = 70){
    let vectorA = new THREE.Vector3(points[0],points[1],points[2]);
    let vectorB = new THREE.Vector3(points[3],points[4],points[5]);
    let vectorC = new THREE.Vector3(points[6],points[7],points[8]);

    const quaternionAB = new THREE.Quaternion();
    quaternionAB.setFromUnitVectors(vectorA.normalize(), vectorB.normalize());
    const quaternionAC = new THREE.Quaternion();
    quaternionAC.setFromUnitVectors(vectorA.normalize(), vectorC.normalize());

    let vertices = [];
    let indices = [];

    // Compute Vertices
    const currVector = new THREE.Vector3();
    const ghostVector = new THREE.Vector3();
    const currQuat = new THREE.Quaternion();
    for (let col = 0; col < edgeVertices + 2; col++){
        for (let row = 0; row < edgeVertices + 2 - col; row++){
            currVector.copy(vectorA);
            currQuat.identity();

            currVector.lerp(vectorB, row/(edgeVertices+1));
            ghostVector.copy(vectorC).lerp(vectorB, row/(edgeVertices+1));

            currVector.lerp(ghostVector, col/Math.max(edgeVertices+1-row, 1));
            
            currVector.setLength(0.99);
            let pos = currVector.toArray();
            vertices.push(pos[0],pos[1],pos[2])
        }
    }

    // Compute Faces
    for (let col = 0; col < edgeVertices + 1; col++){
        let prevColStart = getColumnStartIndex(col-1, edgeVertices);
        let colStart = getColumnStartIndex(col, edgeVertices);
        let nextColStart = getColumnStartIndex(col+1, edgeVertices);
        for (let row = 0; row < edgeVertices + 1 - col; row++){
            indices.push(colStart+row,colStart+row+1, nextColStart+row);
            if (col > 0)
                indices.push(colStart+row,colStart+row+1, prevColStart+row+1);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setIndex( indices );
    const material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, color: 0x4F42B5 });
    return new THREE.Mesh( geometry, material );
}

function createLabel(text, position) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = text;
    labelDiv.style.color = 'white';
    const label = new CSS2DObject(labelDiv);
    label.position.set(position[0], position[1], position[2]);
    return label;
}

function getColumnStartIndex(col, edgeVertices){
    return col*(edgeVertices+2) - col*(col-1)/2;
}

function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

/* Data */
THREE.Cache.enabled = true;
const fileLoader = new THREE.FileLoader();

function loadMesh() {
    return new Promise((resolve, reject) => {
        let meshData = { vertices: [], faces: [] };

        fileLoader.load('./mesh files/sphere4.sph', 
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

function randomLongLat(){ 
    // uniformly random lat long on the surface of unit sphere
    // (eto yung nasa link pero mukhang di gumagana)
    let u = Math.random();
    let v = Math.random();
    var lat = toDegrees(Math.acos(2*v-1))-90;
    var long = 360*u-180;
    return [long, lat];
}

function generate_random_points(num_points=100){
    // returns array of [long, lat]
    let vertices = [];
    let vec3 = new THREE.Vector3();
    for (let point_i=0; point_i < num_points; point_i++){
        let rll = randomLongLat()
        vertices.push(rll);
    }
    //console.log(vertices.map((x) => x));
    return vertices;
}

function shuffle(array) {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
}

function remove_triangles(triangles, percent) {
    console.log("og length ", triangles.length);
    shuffle(triangles);
    triangles = triangles.slice(Math.floor(triangles.length * (percent)));
    console.log("new length ", triangles.length);
    return triangles;
}

async function init() {
    //const meshData = await loadMesh();
    const random_points = generate_random_points(10);
    const delaunay = geoDelaunay(random_points); // calculate delaunay things
    console.log(delaunay);
    const d_triangles = remove_triangles(delaunay.triangles.map((x) => x), 0.4); // get calculated triangles

    // d_triangles, reverse the order of the points in each triangle to make it counter-clockwise
    for (let i = 0; i < d_triangles.length; i++) {
        d_triangles[i] = d_triangles[i].reverse();
    }

    // Neighbors ni faces (O(n^4) very not optimal)
    let chosenNeighbors = [];
    for (let i = 0; i < d_triangles.length; i++) {
        let thisFaceNeighbors = [];
        let positions = [];
        for (let j = 0; j < delaunay.triangles.length; j++) {
            let thisFace = d_triangles[i];
            let otherFace = delaunay.triangles[j];
            if (thisFace !== otherFace) {

                // Order to push the index of the triangle in d_triangles: edge 0,2 or 2,0 then edge 1,0 or 0,1 then edge 1,2 or 2,1
                let thisFaceEdges = [[thisFace[0], thisFace[2]], [thisFace[1], thisFace[0]], [thisFace[1], thisFace[2]]];
                let otherFaceEdges = [[otherFace[0], otherFace[2]], [otherFace[1], otherFace[0]], [otherFace[1], otherFace[2]]];

                /* Brute Force */
                let position = -1;
                for (let k = 0; k < 3; k++) {
                    for (let l = 0; l < 3; l++) {
                        if (thisFaceEdges[k][0] === otherFaceEdges[l][0] && thisFaceEdges[k][1] === otherFaceEdges[l][1] || 
                            thisFaceEdges[k][0] === otherFaceEdges[l][1] && thisFaceEdges[k][1] === otherFaceEdges[l][0]) {
                            position = k;
                            break;
                        }
                    }
                }

                // Is a neighbor
                console.log(i, "thisFace", thisFace, "otherFace", otherFace, "position", position);
                if (position !== -1) {
                    if (!d_triangles.includes(otherFace)) {
                        thisFaceNeighbors.push(-1);
                        positions.push(position);
                        continue;
                    } // Shares a face with an obstacle

                    // Map the delauny.triangles index to the d_triangles index
                    let mappedIndex = d_triangles.indexOf(otherFace);
                    thisFaceNeighbors.push(mappedIndex);
                    positions.push(position);
                }
            }
        }
        // fix the order of the neighbors to match the order in positions
        let orderedNeighbors = JSON.parse(JSON.stringify(thisFaceNeighbors));
        for (let k = 0; k < positions.length; k++) {
            orderedNeighbors[positions[k]] = thisFaceNeighbors[k];
        }
        thisFaceNeighbors = JSON.parse(JSON.stringify(orderedNeighbors));
        chosenNeighbors.push(thisFaceNeighbors);
    }

    const meshData = {vertices:random_points, faces:d_triangles}; // set vertices and faces
    console.log(meshData);
    console.log("Neighbors:", chosenNeighbors);

    /* Scene */
    // Canvas
    const canvas = document.querySelector('canvas.webgl');

    // Scene
    const scene = new THREE.Scene();

    // Mesh Info
    // const meshDataString = JSON.stringify(meshData, null, 2); 
    // const meshDiv = document.createElement('div');
    // meshDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    // meshDiv.className = 'meshInfo';
    // meshDiv.textContent = meshDataString;
    // meshDiv.style.position = 'static';
    // meshDiv.style.color = 'white';
    // const meshInfo = new CSS2DObject(meshDiv);
    // meshInfo.position.set(0, 2, 0);
    // meshInfo.scale.set(0.1, 0.1, 0.1);
    // scene.add(meshInfo);

    // Sphere Object
    const geometrySphere = new THREE.SphereGeometry(0.97, 32, 32);
    const materialSphere = new THREE.MeshBasicMaterial({ color: 0x008000});
    const meshSphere = new THREE.Mesh(geometrySphere, materialSphere);
    scene.add(meshSphere);

    // Particles Object
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = meshData.vertices.length;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const lat = meshData.vertices[i][1];
        const long = meshData.vertices[i][0];
        const [x, y, z] = latlongToCartesian(lat, long, 1);
        meshData.vertices[i] = [x, y, z];
    }

    for (let i = 0; i < particleCount; i++) {
        const particleLabel = createLabel(`P${i}`, meshData.vertices[i]);
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

    // Faces
    for (let i = 0; i < meshData.faces.length; i++) {
        let face_indices = [];
        let face_vertices = [];
        for (let j = 0; j < meshData.faces[i].length; j++) {
            face_vertices.push(meshData.vertices[meshData.faces[i][j]]);
        }
        face_vertices = face_vertices.flat();

        for (let t = 1; t<meshData.faces[i].length; t++) {
            face_indices.push(0,t,t+1);
        }

        for (let t = 0; t < face_indices.length; t += 3) {
            let triangleVertices = [];
            for (let v = 0; v < 3; v++) {
                let vertex_index = face_indices[t+v];
                for (let c = 0; c < 3; c++) {
                    triangleVertices.push(face_vertices[vertex_index*3+c]);
                }
            }
            let sphericalTriangles = createSphericalTriangle(triangleVertices);
            scene.add(sphericalTriangles);
        }

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
        }
    }
    
    // Results
    // const resultData = await loadResult();
    // for (let i = 0; i < resultData.length; i++) {

    //     const pointSphereGeom = new THREE.SphereGeometry(0.02, 32, 32);
    //     const pointSphereMat = new THREE.MeshBasicMaterial({ color: 0x916248 });
    //     const pointSphere = new THREE.Mesh(pointSphereGeom, pointSphereMat);
    //     pointSphere.position.set(resultData[i][0], resultData[i][1], resultData[i][2]);
    //     scene.add(pointSphere);
        
    //     if (i !== resultData.length - 1) {
    //         const line = createSphericalCurve(resultData[i], resultData[i + 1], 1, 0xbae1ff);
    //         scene.add(line[0]);
    //     }
    // }

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