/**
 * AmmoRigidBody
 * 
 * Box shaped collision body in ammo.js. Available attribute are mass and
 * halfExtents. If mass is set to 0, the body will be created as a static body.
 */

var _ = require('underscore');

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
  this.getEvents().off('ammoworld_ready', this.ammoWorldReady, this);
};

AmmoRigidBody.prototype.objectLoaded = function() {
  this.createCollider();
};

AmmoRigidBody.prototype.update = function() {
  if (this.body) {
    var position = this.getThreeData().position,
        quaternion = this.getThreeData().quaternion;

    this.body.getMotionState().getWorldTransform(trans);
    position.x = trans.getOrigin().x();
    position.y = trans.getOrigin().y();
    position.z = trans.getOrigin().z();
    quaternion.x = trans.getRotation().x();
    quaternion.y = trans.getRotation().y();
    quaternion.z = trans.getRotation().z();
    quaternion.w = trans.getRotation().w();
  }
};

AmmoRigidBody.prototype.ammoWorldReady = function(ammoWorldComponent) {
  if (!this.ammoWorldComponent) {
    this.ammoWorldComponent = ammoWorldComponent;
    this.createCollider();
  }
};

AmmoRigidBody.prototype.createCollider = function() {
  if (!this.getThreeData() || !this.ammoWorldComponent) {
    return;
  }

  var position = this.getThreeData().position,
      quaternion = this.getThreeData().quaternion,
      colShape,
      startTransform = new Ammo.btTransform(),
      isDynamic = (this.mass != 0),
      localInertia = new Ammo.btVector3(0, 0, 0),
      myMotionState,
      rbInfo,
      body;

  if (this.shape.shape === 'box') {
    colShape = new Ammo.btBoxShape(new Ammo.btVector3(this.shape.halfExtents.x,
        this.shape.halfExtents.y, this.shape.halfExtents.z));
  } else if (this.shape.shape === 'sphere') {
    colShape = new Ammo.btSphereShape(this.shape.radius);
  } else if (this.shape.shape === 'plane') {
    colShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(this.shape.normal.x, this.shape.normal.y, this.shape.normal.z), this.shape.distance);
  } else if (this.shape.shape === 'auto') {
    colShape = this.createAutoShape(); 
  } else {
    return console.error('Unknown shape: ' + this.shape.shape);
  }

  startTransform.setIdentity();

  if (isDynamic) {
    colShape.calculateLocalInertia(this.mass,localInertia);
  }

  startTransform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
  startTransform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));

  myMotionState = new Ammo.btDefaultMotionState(startTransform);
  rbInfo = new Ammo.btRigidBodyConstructionInfo(this.mass, myMotionState, colShape, localInertia);
  body = new Ammo.btRigidBody(rbInfo);

  body.setRestitution(this.restitution);
  body.setFriction(this.friction);

  this.ammoWorldComponent.dynamicsWorld.addRigidBody(body);
  this.body = body;
};

AmmoRigidBody.prototype.createAutoShape = function() {
  var compound = new Ammo.btCompoundShape(),
      worldPosition = new THREE.Vector3(),
      worldRotation = new THREE.Quaternion(),
      worldScale = new THREE.Vector3(),
      tmpMatrix = new THREE.Matrix4();
  
  worldPosition.getPositionFromMatrix(this.getThreeData().matrixWorld);
  worldScale.getScaleFromMatrix(this.getThreeData().matrixWorld);
  tmpMatrix.extractRotation(this.getThreeData().matrixWorld);
  worldRotation.setFromRotationMatrix(tmpMatrix);
  
  this.getThreeData().traverse(_.bind(function(o) {
    var min, max, halfExtents, tmpVec3 = new THREE.Vector3(),
        position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        worldTransform = o.matrixWorld.clone(),
        localTransform = o.matrixWorld.clone(),
        scale = new THREE.Vector3();
    
    tmpMatrix.getInverse(o.parent.matrixWorld);
    
    tmpMatrix.multiply(localTransform);
    localTransform = tmpMatrix;
        
    if (o instanceof THREE.Mesh && o.veroldAssetID) {
      
      position.getPositionFromMatrix(localTransform);
      scale.getScaleFromMatrix(o.matrixWorld);
      tmpMatrix.extractRotation(localTransform);
      rotation.setFromRotationMatrix(tmpMatrix);
      
      o.geometry.computeBoundingBox();
      min = o.geometry.boundingBox.min.clone();
      max = o.geometry.boundingBox.max.clone();
      
      tmpVec3.subVectors(max, min); 
      tmpVec3.multiplyScalar(0.5);
      
      tmpVec3.multiplyVectors(tmpVec3, scale);
      halfExtents = tmpVec3;
      
      var center = new THREE.Vector3();
      center.x = ( min.x + max.x ) / 2;
      center.y = ( min.y + max.y ) / 2;
      center.z = ( min.z + max.z ) / 2;
      center.multiplyVectors(center, scale);
      
      var shape = new Ammo.btBoxShape(new Ammo.btVector3(halfExtents.x,
        halfExtents.y, halfExtents.z));
      
      var localTransform = new Ammo.btTransform();
      localTransform.setIdentity();
      localTransform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
      localTransform.setRotation(new Ammo.btQuaternion(rotation.x, rotation.y, rotation.z, rotation.w));
      compound.addChildShape(localTransform, shape);
    }
  },this));
  
  return compound;
};

return AmmoRigidBody;

