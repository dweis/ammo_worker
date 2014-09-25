var AmmoBaseObject = require('./ammo_base_object');

function AmmoCollisionObject(proxy, bodyId) {
  this.proxy = proxy;
  this.bodyId = bodyId;
  this.binding = undefined;
  this.position = { x: 0, y: 0, z: 0 };
  this.rotation = { x: 0, y: 0, z: 0, w: 1 };
} 

AmmoCollisionObject.prototype = new AmmoBaseObject();

AmmoCollisionObject.prototype.addToWorld = function(group, mask) {
  return this.proxy.execute('DynamicsWorld_addCollisionObject', {
    collisionObjectId: this.bodyId,
    group: group,
    mask: mask
  });
};

AmmoCollisionObject.prototype.setFriction = function(friction) {
  return this.proxy.execute('CollisionObject_setFriction', {
    bodyId: this.bodyId,
    friction: friction
  });
};

AmmoCollisionObject.prototype.setRestitution = function(restitution) {
  return this.proxy.execute('CollisionObject_setRestitution', {
    bodyId: this.bodyId,
    restitution: restitution
  });
};

module.exports = AmmoCollisionObject;
