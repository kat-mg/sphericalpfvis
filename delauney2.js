import { geoDelaunay } from "d3-geo-voronoi";

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

function findPolyNeighbors(triangle, validTriangles, allTriangles) {
    console.log("Triangle", triangle); // FOR DEBUGGING
    let thisRefNeighbors = [];
    let thisFaceNeighbors = [];
    let positions = [];
    for (let i = 0; i < allTriangles.length; i++) {
        let otherFace = allTriangles[i];
        if (triangle !== otherFace) {
            let thisFaceEdges = [[triangle[0], triangle[2]], [triangle[1], triangle[0]], [triangle[1], triangle[2]]];
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

            if (position !== -1) {
                if (!validTriangles.includes(otherFace)) {
                    thisRefNeighbors.push([-1, i]);
                    thisFaceNeighbors.push(-1);
                    positions.push(position);
                    continue;
                } // Shares a face with an obstacle

                // Map the delauny.triangles index to the d_triangles index
                let mappedIndex = validTriangles.indexOf(otherFace);
                thisRefNeighbors.push([mappedIndex, i]);
                thisFaceNeighbors.push(mappedIndex);
                positions.push(position);
            } // Is a neighbor
        }
    }

    let orderedNeighbors = JSON.parse(JSON.stringify(thisFaceNeighbors));
    let orderedRefNeighbors = thisRefNeighbors.map((x) => x);
    for (let k = 0; k < positions.length; k++) {
        orderedNeighbors[positions[k]] = thisFaceNeighbors[k];
        orderedRefNeighbors[positions[k]] = thisRefNeighbors[k];
    }

    thisFaceNeighbors = JSON.parse(JSON.stringify(orderedNeighbors));
    thisRefNeighbors = JSON.parse(JSON.stringify(orderedRefNeighbors));
    let thisTriangleCopy = JSON.parse(JSON.stringify(triangle));

    console.log("thisFaceNeighbors", thisFaceNeighbors, "thisRefNeighbors", thisRefNeighbors); // FOR DEBUGGING

    return [thisFaceNeighbors, thisRefNeighbors, thisTriangleCopy];
}

function findNextTriangle(vertex, triangle, allTriangles, alreadyNeighbors) {
    //console.log("Vertex", vertex, "Triangle", triangle, "Neighbors", alreadyNeighbors); // FOR DEBUGGING
    let triangleEdges = [[triangle[0], triangle[2]], [triangle[1], triangle[0]], [triangle[1], triangle[2]]];
    for (let i = 0; i < allTriangles.length; i++) {
        if (allTriangles[i] === triangle || alreadyNeighbors.includes(i)) {
            continue; // Skip the triangle if it has the same elements as the current triangle (regardless of order)
        }
        let otherFaceEdges = [[allTriangles[i][0], allTriangles[i][2]], [allTriangles[i][1], allTriangles[i][0]], [allTriangles[i][1], allTriangles[i][2]]];
        let isNeighbor = false;
        for (let k = 0; k < 3; k++) {
            for (let l = 0; l < 3; l++) {
                if (triangleEdges[k][0] === otherFaceEdges[l][0] && triangleEdges[k][1] === otherFaceEdges[l][1] || 
                    triangleEdges[k][0] === otherFaceEdges[l][1] && triangleEdges[k][1] === otherFaceEdges[l][0]) {
                    isNeighbor = true;
                    break;
                }
            }
            if (isNeighbor) {
                break;
            }
        } // Check if the triangle shares an edge with the other triangle

        if (isNeighbor && allTriangles[i].includes(vertex)) {
            return i; // Return the index of the triangle that shares an edge with this triangle and has the same vertex
        }
    } // Go through all the triangles to find the next triangle that shares an edge with this triangle

    return -2; // Return -2 if no triangle is found
}

function init() {
    const random_points = generate_random_points(10);
    const delaunay = geoDelaunay(random_points); // calculate delaunay things
    let d_triangles = remove_triangles(delaunay.triangles.map((x) => x), 0.4); // get calculated triangles

    console.log("Delaunay triangles:", delaunay.triangles); // FOR DEBUGGING

    // d_triangles, reverse the order of the points in each triangle to make it counter-clockwise
    for (let i = 0; i < d_triangles.length; i++) {
        d_triangles[i] = d_triangles[i].reverse();
    }
    console.log("d_triangles length and contents:", d_triangles.length, d_triangles); // FOR DEBUGGING

    let triangles = [];
    // Neighbors ni faces (O(n^3) very not optimal)
    let referenceNeighbors = [];
    let chosenNeighbors = [];
    for (let i = 0; i < d_triangles.length; i++) {
        let thisTriangleData = findPolyNeighbors(d_triangles[i], d_triangles, delaunay.triangles);
        chosenNeighbors.push(thisTriangleData[0]);
        referenceNeighbors.push(thisTriangleData[1]);
        triangles.push(thisTriangleData[2]);
    }

    // Neighbors ni vertices (also O(n^4) very not optimal)
    console.log("Vertices length and contents:", random_points.length, random_points);
    console.log("Triangles length and contents:", d_triangles.length, d_triangles);
    console.log("Chosen Neighbors length and contents:", chosenNeighbors.length, chosenNeighbors);
    console.log("Reference Neighbors length and contents:", referenceNeighbors.length, referenceNeighbors);

    let vertNeighborsOrdered = [];
    for (let i = 0; i < random_points.length; i++) {
        let thisVertNeighbors = [];
        let vertexValid = false;
        let validNeighbor = -2;

        for (let j = 0; j < d_triangles.length; j++) {
            if (d_triangles[j].includes(i)) {
                // Required Setup (to ensure counterclockwise)
                while (d_triangles[j][0] !== i) {
                    d_triangles[j].unshift(d_triangles[j].pop()); // rotate the triangle so that the vertex is at the front
                } // Ensure that the vertex is at the front of the triangle

                let thisTriangleData = findPolyNeighbors(d_triangles[j], d_triangles, delaunay.triangles); // get the counterclockwise neighbors of this triangle order
                let thisTriangleNeighbors = thisTriangleData[0]; // get the neighbors of this triangle acc to d_triangless
                let thisTriangleRefNeighbors = thisTriangleData[1]; // get the reference neighbors of this triangle will be [d_triangless index, delaunay.triangles index]
                
                vertexValid = true; // vertex is valid
                thisVertNeighbors.push(delaunay.triangles.indexOf(d_triangles[j])); // add the triangle to the list of neighbors

                for (let k = 0; k < thisTriangleNeighbors.length; k++) {
                    if (thisTriangleNeighbors[k] !== -1) {
                        let otherFace = d_triangles[thisTriangleNeighbors[k]]; // get the other face of this triangle
                        if (otherFace.includes(i)) {
                            validNeighbor = thisTriangleRefNeighbors[k][1]; // validNeighbor stores the ORIGINAL index of the triangle in delaunay.triangles
                            thisVertNeighbors.push(thisTriangleRefNeighbors[k][1]); // thisVertNeighbors stores the ORIGINAL index as well
                            break;
                        }
                    }
                    if (thisTriangleNeighbors[k] === -1) {
                        let otherFace = delaunay.triangles[thisTriangleRefNeighbors[k][1]];
                        if (otherFace.includes(i)) {
                            validNeighbor = thisTriangleRefNeighbors[k][1]; // validNeighbor stores the ORIGINAL index of the triangle in delaunay.triangles
                            thisVertNeighbors.push(thisTriangleRefNeighbors[k][1]); // thisVertNeighbors stores the ORIGINAL index as well
                            break;
                        }
                    }
                } // Find the neighbot of this triangle that also has this vertex
            }

            if (vertexValid) {
                break;  // stop checking the triangles if we found the vertex in this triangle
            }
        } // Go through all the valid triangles to look for one that has random_points[i] as a vertex (oks na part na ito)

        if (!vertexValid) {
            console.log("Vertex", i, "is not valid"); // FOR DEBUGGING
            random_points = random_points.filter(item => item !== random_points[i]); // remove the vertex from the list of vertices
            console.log("random_points", random_points); // FOR DEBUGGING
            continue; // skip this vertex if it is not valid
        }
        else {
            let currentTriangle = validNeighbor;
            console.log("Vertex", i, "is valid with neighbors", thisVertNeighbors, "current triangle is: ", currentTriangle); // FOR DEBUGGING
            // TO DO (Find the neighbor of validNeighbor with the same vertex as this vertex at all triangles)
            while (currentTriangle !== -2) {
                //console.log("Current triangle", currentTriangle, "Neighbors", thisVertNeighbors); // FOR DEBUGGING
                currentTriangle = findNextTriangle(i, delaunay.triangles[currentTriangle], delaunay.triangles, thisVertNeighbors); // find the next triangle that shares an edge with this triangle
                if (currentTriangle !== -2) {
                    // Current triangle returns the index of the triangle based on the delaunay.triangles index
                    thisVertNeighbors.push(currentTriangle); // add the triangle to the list of neighbors
                    //console.log("Next triangle", currentTriangle, "Neighbors", thisVertNeighbors); // FOR DEBUGGING
                }
            }
            console.log("Final vertex neighbors length and contents", thisVertNeighbors.length, thisVertNeighbors); // FOR DEBUGGING
        }

    } // Go through all the vertices and find their neighbors

    console.log("d_triangles length and contents:", d_triangles.length, d_triangles); // FOR DEBUGGING
    console.log("allTriangles length and contents:", delaunay.triangles.length, delaunay.triangles); // FOR DEBUGGING

    const meshData = {vertices:random_points, faces:triangles}; // set vertices and faces
    console.log("Mesh Data:", meshData);

    let data = "sph";
    let vertNeighbors = delaunay.neighbors.map((x) => x);
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

    console.log("Data:", data);
}

init();
