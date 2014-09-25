var when = require('when'),
    _ = require('underscore'),
    AmmoCollisionObject = require('./ammo_collision_object');

function AmmoRigidBody(proxy, bodyId) {
  this.proxy = proxy;
  this.bodyId = bodyId;
  this.binding = undefined;
  this.position = { x: 0, y: 0, z: 0 };
  this.rotation = { x: 0, y: 0, z: 0, w: 1 };
  this.linearVelocity = { x: 0, y: 0, z: 0 };
  this.angularVelocity = { x: 0, y: 0, z: 0 };
}

AmmoRigidBody.prototype = new AmmoCollisionObject();

AmmoRigidBody.prototype.update = function() {
  if (this.binding && this.binding.update) {
    this.binding.update();
  }
};

AmmoRigidBody.prototype.setType = function(type) {
  return this.proxy.execute('RigidBody_setType', {
    bodyId: this.bodyId,
    type: type
  });
};

AmmoRigidBody.prototype.setDamping = function(linearDamping, angularDamping) {
  return this.proxy.execute('RigidBody_setDamping', {
    bodyId: this.bodyId,
    linearDamping: linearDamping,
    angularDamping: angularDamping
  });
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

AmmoRigidBody.prototype.setLinearFactor = function(linearFactor) {
  return this.proxy.execute('RigidBody_setLinearFactor', {
    bodyId: this.bodyId,
    linearFactor: {
      x: linearFactor.x,
      y: linearFactor.y,
      z: linearFactor.z
    }
  });
};

AmmoRigidBody.prototype.setAngularFactor = function(angularFactor) {
  return this.proxy.execute('RigidBody_setAngularFactor', {
    bodyId: this.bodyId,
    angularFactor: {
      x: angularFactor.x,
      y: angularFactor.y,
      z: angularFactor.z
    }
  });
};

AmmoRigidBody.prototype.getLinearVelocity = function() {
  var deferred = when.defer();

  this.proxy.execute('RigidBody_getLinearVelocity', { bodyId: this.bodyId }, true)
    .then(_.bind(function(linearVelocity) {
      deferred.resolve(linearVelocity);
    }, this));

  return deferred.promise;
};

AmmoRigidBody.prototype.setLinearVelocity = function(linearVelocity) {
  return this.proxy.execute('RigidBody_setLinearVelocity', {
    bodyId: this.bodyId,
    linearVelocity: {
      x: linearVelocity.x,
      y: linearVelocity.y,
      z: linearVelocity.z
    }
  });
};

AmmoRigidBody.prototype.getAngularVelocity = function() {
  var deferred = when.defer();

  this.proxy.execute('RigidBody_getAngularVelocity', { bodyId: this.bodyId }, true)
    .then(_.bind(function(angularVelocity) {
      deferred.resolve(angularVelocity);
    }, this));

  return deferred.promise;
};

AmmoRigidBody.prototype.setAngularVelocity = function(angularVelocity) {
  return this.proxy.execute('RigidBody_setAngularVelocity', {
    bodyId: this.bodyId,
    angularVelocity: {
      x: angularVelocity.x,
      y: angularVelocity.y,
      z: angularVelocity.z
    }
  });
};


AmmoRigidBody.prototype.destroy = function() {
  var deferred = this.proxy.execute('RigidBody_destroy', { bodyId: this.bodyId });

  this.bodyId = undefined;

  this.binding.destroy();

  return deferred;
};


AmmoRigidBody.prototype.addToWorld = function(group, mask) {
  return this.proxy.execute('DynamicsWorld_addRigidBody', {
    bodyId: this.bodyId,
    group: group,
    mask: mask
  });
};

AmmoRigidBody.prototype.setWorldTransform = function(position, rotation) {
  return this.proxy.execute('RigidBody_setWorldTransform', {
    bodyId: this.bodyId,
    position: position,
    rotation: rotation
  });
};

AmmoRigidBody.prototype.clearForces = function() {
  return this.proxy.execute('RigidBody_clearForces', {
    bodyId: this.bodyId
  });
};

AmmoRigidBody.prototype.setActivationState = function(activationState) {
  return this.proxy.execute('CollisionObject_setActivationState', {
    bodyId: this.bodyId,
    activationState: activationState
  });
};

module.exports = AmmoRigidBody;
