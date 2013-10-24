var DemoScene = function() {
}

DemoScene.prototype.init = function() {
  this._initWorker();
};

DemoScene.prototype._initWorker = function() {
  this.worker = new AmmoWorker();

  this.worker.on('error', function(err) {
    throw(err);
  });

  this.worker.on('update', function(data) {
    this.next = new Float64Array(data);
  }.bind(this));

  this.worker.on('ready', function() {
    this._initScene();

  }.bind(this));
};

DemoScene.prototype._initScene = function() {
  var stats = this.stats = new Stats();
  stats.setMode(0);

  // Align top-left
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.bottom = '0px';

  document.body.appendChild(stats.domElement);

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
  var renderer = this.renderer = new THREE.WebGLRenderer();
  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;
  renderer.shadowMapType = THREE.PCFSoftShadowMap;
  renderer.physicallyBasedShading = true;
  var camera = this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
  var scene = this.scene = new THREE.Scene();

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = 50;
  camera.position.y = 10;
  camera.position.x = 10;
  camera.lookAt(new THREE.Vector3(0,2.5,0));

  var controls = this.controls = new THREE.OrbitControls(camera);

  // start the renderer
  renderer.setSize(WIDTH, HEIGHT);

  // attach the render-supplied DOM element
  container.appendChild(renderer.domElement);

  var groundMaterial = new THREE.MeshLambertMaterial({
    color: 0x666666
  });

  var ground = new THREE.Mesh(new THREE.CubeGeometry(1000,0.001, 1000),groundMaterial); 
  //ground.quaternion.setFromAxisAngle({ x: 1, y: 0, z: 0 }, -Math.PI/2);
  ground.receiveShadow = true;
  scene.add(ground);

  this.worker.addRigidBodyObject(ground, 0);
  scene.add(camera);

  var light = new THREE.DirectionalLight( 0xCCCCCC );
  light.position.set( 20, 80, 0 );
  light.target.position.copy( scene.position );
  light.castShadow = true;
  scene.add(light);

  if (typeof this.initDemo === 'function') {
    this.initDemo();
  }

  this.worker.startSimulation();

  this.update = this.update.bind(this);
  requestAnimationFrame(this.update);
};

DemoScene.prototype.update = function(delta) {
  this.stats.begin();
  if (typeof this.preUpdate === 'function') {
    this.preUpdate(delta);
  }

  this.controls.update();
  this.renderer.render(this.scene, this.camera);

  if (typeof this.postUpdate === 'function') {
    this.postUpdate(delta);
  }

  this.stats.end();

  requestAnimationFrame(this.update);
}
