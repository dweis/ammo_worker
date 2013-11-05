define([], function() {
  function AmmoGhostObject(proxy, ghostId) {
    this.proxy = proxy;
    this.ghostId = ghostId;
  }

  AmmoGhostObject.prototype.addToWorld = function(group, mask) {
    return this.proxy.execute('DynamicsWorld_addGhostObject', {
      ghostId: this.ghostId,
      group: group,
      mask: mask
    });
  };

  return AmmoGhostObject;
});
