// set the scene size
var WIDTH = document.body.clientWidth,
    HEIGHT = document.body.clientHeight;

// set some camera attributes
var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.01,
    FAR = 1000;

// get the DOM element to attach to
// - assume we've got jQuery to hand
var container = document.getElementById('container');

// create a WebGL renderer, camera
// and a scene
var renderer = new THREE.WebGLRenderer();
renderer.shadowMapEnabled = true;
renderer.shadowMapSoft = false;
renderer.shadowMapType = THREE.PCFSoftShadowMap;
renderer.physicallyBasedShading = true;
var camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
var scene = new THREE.Scene();

// the camera starts at 0,0,0 so pull it back
camera.position.z = 50;
camera.position.y = 10;
camera.position.x = 10;
camera.lookAt(new THREE.Vector3(0,2.5,0));

// start the renderer
renderer.setSize(WIDTH, HEIGHT);

// attach the render-supplied DOM element
container.appendChild(renderer.domElement);

var groundMaterial = new THREE.MeshLambertMaterial({
  color: 0x00CC00
});

var ground = new THREE.Mesh(new THREE.PlaneGeometry(100,100),groundMaterial); 
ground.quaternion.setFromAxisAngle({ x: 1, y: 0, z: 0 }, -Math.PI/2);
ground.receiveShadow = true;
scene.add(ground);
// and the camera
scene.add(camera);

var light = new THREE.DirectionalLight( 0xCCCCCC );
light.position.set( 20, 80, 0 );
light.target.position.copy( scene.position );
light.castShadow = true;
scene.add(light);
