define([], function() {
  function AmmoKinematicCharacterController(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.binding = undefined;
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    this.linearVelocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
  } 

  AmmoKinematicCharacterController.prototype.update = function() {
    if (this.binding && this.binding.update) {
      this.binding.update();
    }
  };


  return AmmoKinematicCharacterController;
});
