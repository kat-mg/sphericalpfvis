import {geoDelaunay} from "https://cdn.skypack.dev/d3-geo-voronoi@2";

const toDegrees = (radians) => radians / Math.PI * 180;

function randomLongLat() { 
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
    for (let point_i=0; point_i < num_points; point_i++) {
        let rll = randomLongLat()
        vertices.push(rll);
    }
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

const random_points = generate_random_points(10);
const delaunay = geoDelaunay(random_points); // calculate delaunay things
console.log(delaunay);
const d_triangles = remove_triangles(delaunay.triangles.map((x) => x), 0.4); // get calculated triangles
const meshData = {vertices:random_points, faces:d_triangles}; // set vertices and faces

console.log(meshData);

/* .sph creation */

let data = "sph";

// Neighbors ni vertices
let vertNeighbors = delaunay.neighbors.map((x) => x);
for (let i = 0; i < meshData.vertices.length + meshData.faces.length; i++) {
    if (i < meshData.vertices.length) {
        data = data.concat("\n", meshData.vertices[i][0], " ", meshData.vertices[i][1]);
        for (let j = 0; j < vertNeighbors[i].length; j++) {
            data = data.concat(" ", vertNeighbors[i][j]);
        }
    }
    else {
        data = data.concat("\n");
        for (let j = 0; j < meshData.faces[i - meshData.vertices.length].length; j++) {
            if (j != 0) {
                data = data.concat(" ");
            }
            data = data.concat(meshData.faces[i - meshData.vertices.length][j]);
        }
    }
}

// Neighbors ni faces (O(n^4) very not optimal)
let chosenNeighbors = [];
for (let i = 0; i < d_triangles.length; i++) {
    let thisFaceNeghbors = [];
    for (let j = 0; j < d_triangles.length; j++) {
        if (i != j) {
            // check if triangles i and j share an edge
            let shared = 0;
            for (let k = 0; k < 3; k++) {
                for (let l = 0; l < 3; l++) {
                    if (d_triangles[i][k] == d_triangles[j][l]) {
                        shared++;
                    }
                }
            }
            if (shared == 2) {
                thisFaceNeghbors.push(j);
                continue;
            }
        }
    }

    while (thisFaceNeghbors.length < 3) {
        thisFaceNeghbors.push(-1);
    }
    chosenNeighbors.push(thisFaceNeghbors);
}
console.log("Chosen:", chosenNeighbors);

console.log("Data:", data);