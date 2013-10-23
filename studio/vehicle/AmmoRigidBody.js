/**
 * AmmoBoxBody
 *
 * Box shaped collision body in ammo.js. Available attribute are mass and
 * halfExtents. If mass is set to 0, the body will be created as a static body.
 */
 
/* global VAPI, Ammo */
var trans = new Ammo.btTransform();
 
function AmmoRigidBody() {
  this.ammoWorldComponent = null;
  this.body = null;
}
 
AmmoRigidBody.prototype = new VAPI.VeroldComponent();
 
AmmoRigidBody.prototype.init = function() {
  this.getEvents().on('ammoworld_ready', this.ammoWorldReady, this);
};
 
AmmoRigidBody.prototype.shutdown = function() {
  console.log('Shutting down!');
  this.getEvents().off('ammoworld_ready', this.ammoWorldReady, this);
  
};
 
AmmoRigidBody.prototype.objectCreated = function() {
  this.createCollider();
};
 
 
AmmoRigidBody.prototype.editorInit = function() {
  console.log('Editor initialization!!!');  
};
 
AmmoRigidBody.prototype.update = function() {
  if (this.hasThreeData()) {
    var position = this.getThreeData().position,
        quaternion = this.getThreeData().quaternion,
        update;
    
    update = this.ammoWorldComponent && 
      this.ammoWorldComponent.data;
  
    if (update) {
      if (update[this.id * 7 + 1] != 0) {
      position.x = update[this.id * 7 + 0];
      position.y = update[this.id * 7 + 1];
      position.z = update[this.id * 7 + 2];
      quaternion.x = update[this.id * 7 + 3];
      quaternion.y = update[this.id * 7 + 4];
      quaternion.z = update[this.id * 7 + 5];
      quaternion.w = update[this.id * 7 + 6];
      }
    }
  }
};
 
AmmoRigidBody.prototype.ammoWorldReady = function(ammoWorldComponent) {
  if (!this.ammoWorldComponent) {
    this.ammoWorldComponent = ammoWorldComponent;
    this.createCollider();
  }
};
 
AmmoRigidBody.prototype.createCollider = function() {
  if (!this.ammoWorldComponent && window.ammoWorldComponent) {
    this.ammoWorldComponent = window.ammoWorldComponent;
  }
  if (!this.getThreeData() || !this.ammoWorldComponent) {
    return;
  }
 
  var position = this.getThreeData().position,
      quaternion = this.getThreeData().quaternion;
  
  var descriptor = {
    shape: this.shape,
    position: { x: position.x, y: position.y, z: position.z },
    quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
    friction: this.friction,
    restitution: this.restituion,
    mass: this.mass
  };
 
  this.ammoWorldComponent.worker.addRigidBody(descriptor).
  then(_.bind(function(id) {
    console.log('got body id');
    this.id = id;
    this.getObject().trigger('ammobody_ready', id);
  }, this));
};
 
return AmmoRigidBody;
