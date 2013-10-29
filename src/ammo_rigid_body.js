define([], function() {
  function AmmoRigidBody(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.object = undefined;
  } 

  AmmoRigidBody.prototype.update = function() {
    var position, quaternion, pos;

    if (this.object && this.proxy && this.proxy.data) {
      pos = this.proxy.getRigidBodyOffset(this.bodyId);

      position = this.object.position;
      quaternion = this.object.quaternion;

      position.x = this.proxy.data[pos + 0];
      position.y = this.proxy.data[pos + 1];
      position.z = this.proxy.data[pos + 2];
      quaternion.x = this.proxy.data[pos + 3];
      quaternion.y = this.proxy.data[pos + 4];
      quaternion.z = this.proxy.data[pos + 5];
      quaternion.w = this.proxy.data[pos + 6];
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
    var topParent;

    this.object = object;

    topParent = object;

    while (topParent.parent) {
      topParent = topParent.parent;
    }

    topParent.add(object);
  };

  return AmmoRigidBody;
});
