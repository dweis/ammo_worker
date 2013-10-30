define([], function() {
  var tmpVector3 = new THREE.Vector3();
  var tmpQuaternion = new THREE.Quaternion();

  function AmmoRigidBody(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.object = undefined;
  } 

  AmmoRigidBody.prototype.update = function() {
    var position, quaternion, pos;

    if (this.object && this.proxy && this.proxy.data) {
      pos = this.proxy.getRigidBodyOffset(this.bodyId);

      tmpVector3.x = this.proxy.data[pos + 0];
      tmpVector3.y = this.proxy.data[pos + 1];
      tmpVector3.z = this.proxy.data[pos + 2];
      tmpQuaternion.x = this.proxy.data[pos + 3];
      tmpQuaternion.y = this.proxy.data[pos + 4];
      tmpQuaternion.z = this.proxy.data[pos + 5];
      tmpQuaternion.w = this.proxy.data[pos + 6];

      this.object.matrixWorld.makeRotationFromQuaternion(tmpQuaternion);
      this.object.matrixWorld.scale(this.object.originalScale);
      this.object.matrixWorld.setPosition(tmpVector3);
    }
  };

  AmmoRigidBody.prototype.applyTorque = function(torque) {
    return this.proxy.execute('RigidBody_applyTorque', {
      bodyId: this.bodyId,
      torque: {
        x: torque.x,
        y: torque.y,
        z: torque.z
      }
    });
  };

  AmmoRigidBody.prototype.applyForce = function(force, relativePosition) {
    return this.proxy.execute('RigidBody_applyForce', {
      bodyId: this.bodyId,
      force: force,
      relativePosition: relativePosition || { x: 0, y: 0, z: 0 }
    });
  };

  AmmoRigidBody.prototype.applyCentralForce = function(force) {
    return this.proxy.execute('RigidBody_applyCentralForce', {
      bodyId: this.bodyId,
      force: {
        x: force.x,
        y: force.y,
        z: force.z
      }
    });
  };

  AmmoRigidBody.prototype.applyImpulse = function(impulse, relativePosition) {
    return this.proxy.execute('RigidBody_applyImpulse', {
      bodyId: this.bodyId,
      impulse: {
        x: impulse.x,
        y: impulse.y,
        z: impulse.z
      },
      relativePosition: relativePosition && {
        x: relativePosition.x,
        y: relativePosition.y,
        z: relativePosition.z
      } || { x: 0, y: 0, z: 0 }
    });
  };

  AmmoRigidBody.prototype.applyCentralImpulse = function(impulse) {
    return this.proxy.execute('RigidBody_applyCentralImpulse', {
      bodyId: this.bodyId,
      impulse: {
        x: impulse.x,
        y: impulse.y,
        z: impulse.z
      }
    });
  };

  AmmoRigidBody.prototype.setFriction = function(friction) {
    return this.proxy.execute('RigidBody_setFriction', {
      bodyId: this.bodyId,
      friction: friction
    });
  };

  AmmoRigidBody.prototype.setRestitution = function(restitution) {
    return this.proxy.execute('RigidBody_setRestitution', {
      bodyId: this.bodyId,
      restitution: restitution
    });
  };

  AmmoRigidBody.prototype.destroy = function() {
    return this.proxy.execute('RigidBody_destroy', { bodyId: this.bodyId });
  };

  AmmoRigidBody.prototype.setObject = function(object) {
    object.matrixAutoUpdate = false;
    object.updateMatrixWorld();
    object.originalScale = new THREE.Vector3();
    object.originalScale.getScaleFromMatrix(object.matrixWorld);
    
    this.object = object;
  };

  return AmmoRigidBody;
});
