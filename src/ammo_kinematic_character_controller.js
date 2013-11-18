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

  AmmoKinematicCharacterController.prototype.setJumpSpeed = function(jumpSpeed) {
    return this.proxy.execute('KinematicCharacterController_setJumpSeed', {
      controllerId: this.controllerId,
      jumpSpeed: jumpSpeed
    });
  };

  AmmoKinematicCharacterController.prototype.setMaxJumpHeight = function(maxJumpHeight) {
    return this.proxy.execute('KinematicCharacterController_setMaxJumpHeight', {
      controllerId: this.controllerId,
      maxJumpHeight: maxJumpHeight
    });
  };

  AmmoKinematicCharacterController.prototype.setGravity = function(gravity) {
    return this.proxy.execute('KinematicCharacterController_setGravity', {
      controllerId: this.controllerId,
      gravity: gravity
    });
  };

  AmmoKinematicCharacterController.prototype.setUpAxis = function(upAxis) {
    return this.proxy.execute('KinematicCharacterController_setUpAxis', {
      controllerId: this.controllerId,
      upAxis: upAxis
    });
  };

  AmmoKinematicCharacterController.prototype.jump = function() {
    return this.proxy.execute('KinematicCharacterController_jump', {
      controllerId: this.controllerId
    });
  };

  AmmoKinematicCharacterController.prototype.setVelocityForTimeInterval = function(velocity, interval) {
    return this.proxy.execute('KinematicCharacterController_setVelocityForTimeInterval', {
      controllerId: this.controllerId,
      velocity: velocity,
      interval: interval
    });
  };

  AmmoKinematicCharacterController.prototype.setUseGhostSweepTest = function(useGhostSweepTest) {
    return this.proxy.execute('KinematicCharacterController_setUseGhostSweepTest', {
      controllerId: this.controllerId,
      useGhostSweepTest: useGhostSweepTest
    });
  };

  AmmoKinematicCharacterController.prototype.setMaxSlope = function(slopeRadians) {
    return this.proxy.execute('KinematicCharacterController_setMaxSlope', {
      controllerId: this.controllerId,
      slopRadians: slopeRadians
    });
  };

  return AmmoKinematicCharacterController;
});
