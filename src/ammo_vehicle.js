define([ 'underscore' ],function(_) {
  function AmmoVehicle(proxy, vehicleId, rigidBody) {
    this.proxy = proxy;
    this.vehicleId = vehicleId;
    this.wheelBindings = [];
    this.rigidBody = rigidBody;
  } 

  AmmoVehicle.prototype.addWheel = function(connectionPoint, wheelDirection, wheelAxle, 
      suspensionRestLength, wheelRadius, isFrontWheel, tuning) {

    var descriptor = {
      vehicleId: this.vehicleId,
      connectionPoint: connectionPoint,
      wheelDirection: wheelDirection,
      wheelAxle: wheelAxle,
      suspensionRestLength: suspensionRestLength,
      wheelRadius: wheelRadius,
      isFrontWheel: isFrontWheel,
      tuning: tuning
    };

    return this.proxy.execute('Vehicle_addWheel', descriptor);
  };

  AmmoVehicle.prototype.setWheelInfo = function(wheelIndex, properties) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      properties: properties
    };

    return this.proxy.execute('Vehicle_setWheelInfo', descriptor);
  };

  AmmoVehicle.prototype.setBrake = function(wheelIndex, brake) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      brake: brake
    };

    return this.proxy.execute('Vehicle_setBrake', descriptor);
  };

  AmmoVehicle.prototype.applyEngineForce = function(wheelIndex, force) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      force: force
    };

    return this.proxy.execute('Vehicle_applyEngineForce', descriptor);
  };

  AmmoVehicle.prototype.setSteeringValue = function(wheelIndex, steeringValue) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      steeringValue: steeringValue
    };

    return this.proxy.execute('Vehicle_setSteeringValue', descriptor);
  };

  AmmoVehicle.prototype.destroy = function() {
    var descriptor = {
      vehicleId: this.vehicleId
    };

    _.each(this.wheelBindings, function(binding) {
      binding.destroy();
    });

    this.rigidBody.destroy();

    return this.proxy.execute('Vehicle_destroy', descriptor);
  };

  AmmoVehicle.prototype.addWheelObject = function(wheelIndex, object) {
    this.wheelBindings[wheelIndex] = this.proxy.adapter.createBinding(object, 
        this.proxy.getWheelOffset(this.vehicleId, wheelIndex));  
  };

  AmmoVehicle.prototype.update = function() {
    if (this.rigidBody) {
      this.rigidBody.update();
    }

    _.each(this.wheelBindings, function(binding) {
      binding.update();
    });
  };

  return AmmoVehicle;
});
