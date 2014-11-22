var AmmoBaseObject = require('./ammo_base_object');

function AmmoGhostObject(proxy, ghostId) {
  this.proxy = proxy;
  this.ghostId = ghostId;
}

AmmoGhostObject.prototype = new AmmoBaseObject();

AmmoGhostObject.prototype.addToWorld = function(group, mask) {
  return this.proxy.execute('DynamicsWorld_addGhostObject', {
    ghostId: this.ghostId,
    group: group,
    mask: mask
  });
};

AmmoGhostObject.prototype.destroy = function() {
  return this.proxy.execute('GhostObject_destroy', {
    ghostId: this.ghostId
  });
};

AmmoGhostObject.prototype.update = function() {
  if (this.binding && this.binding.update) {
    this.binding.update();
  }
};

module.exports = AmmoGhostObject;
