define([], function() {
  function AmmoRigidBody(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.object = undefined;
  } 

  AmmoRigidBody.prototype.update = function() {
    var position, quaternion, pos, data = this.proxy.data;

    if (this.object && data) {
      pos = this.proxy.getRigidBodyOffset(this.bodyId);

      position = this.object.position;
      quaternion = this.object.quaternion;

      position.x = data[pos + 0];
      position.y = data[pos + 1];
      position.z = data[pos + 2];
      quaternion.x = data[pos + 3];
      quaternion.y = data[pos + 4];
      quaternion.z = data[pos + 5];
      quaternion.w = data[pos + 6];
    }
  };

  AmmoRigidBody.prototype.applyForce = function(force, relativePosition) {
    return this.proxy.execute('RigidBody_applyForce', {
      bodyId: this.bodyId,
      force: force,
      relativePosition: relativePosition
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
    this.object = object;
  };

  return AmmoRigidBody;
});
