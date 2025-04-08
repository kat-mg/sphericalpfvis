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

function generate_random_points(num_points=100) {
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

function init() {
    const random_points = generate_random_points(1000);
    const delaunay = geoDelaunay(random_points); // calculate delaunay things
    console.log(delaunay);
    const d_triangles = remove_triangles(delaunay.triangles.map((x) => x), 0.4); // get calculated triangles
    const meshData = {vertices:random_points, faces:d_triangles}; // set vertices and faces

    console.log(meshData);

    /* .sph creation */

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

    // Neighbors ni vertices
    let vertNeighbors = delaunay.neighbors.map((x) => x);

    let data = "sph";
    data = data.concat("\n", meshData.vertices.length, " ", meshData.faces.length);

    for (let i = 0; i < meshData.vertices.length + meshData.faces.length; i++) {
        if (i < meshData.vertices.length) {
            // There's something wrong here !!!! Positions of vertices are all messed up
            data = data.concat("\n", meshData.vertices[i][1], " ", meshData.vertices[i][0]);
            for (let j = 0; j < vertNeighbors[i].length; j++) {
                data = data.concat(" ", vertNeighbors[i][j]);
            }
        }
        else {
            data = data.concat("\n", meshData.faces[i - meshData.vertices.length].length);
            for (let j = 0; j < meshData.faces[i - meshData.vertices.length].length; j++) {
                data = data.concat(" ");
                data = data.concat(meshData.faces[i - meshData.vertices.length][j]);
            }
            for (let j = 0; j < chosenNeighbors[i - meshData.vertices.length].length; j++) {
                data = data.concat(" ", chosenNeighbors[i - meshData.vertices.length][j]);
            }
        }
    }

    console.log("Chosen:", chosenNeighbors);
    console.log("Data:", data);
    return data;
}

const result = init();