define([], function() {
  function AmmoKinematicCharacterController(proxy, controllerId) {
    this.proxy = proxy;
    this.controllerId = controllerId;
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

  AmmoKinematicCharacterController.prototype.setWalkDirection = function(direction) {
    return this.proxy.execute('KinematicCharacterController_setWalkDirection', {
      controllerId: this.controllerId,
      direction: direction
    });
  };

  return AmmoKinematicCharacterController;
});
