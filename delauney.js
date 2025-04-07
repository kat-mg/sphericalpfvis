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

let data = "sph";

for (let i = 0; i < meshData.vertices.length + meshData.faces.length; i++) {
    if (i < meshData.vertices.length) {
        data = data.concat("\n", meshData.vertices[i][0], " ", meshData.vertices[i][1]);
    }
    else {
        data = data.concat("\n");
        for (let j = 0; j < meshData.faces[i - meshData.vertices.length].length; j++) {
            data = data.concat(" ", meshData.faces[i - meshData.vertices.length][j]);
        }
    }
}

console.log("Data:", data);