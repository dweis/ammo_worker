define([], function() {
  function AmmoRigidBody(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.binding = undefined;
  } 

  AmmoRigidBody.prototype.update = function() {
    if (this.binding && this.binding.update) {
      this.binding.update();
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
    var deferred = this.proxy.execute('RigidBody_destroy', { bodyId: this.bodyId });

    this.bodyId = undefined;

    this.binding.destroy();

    return deferred;
  };

  return AmmoRigidBody;
});
