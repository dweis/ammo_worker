var when = require('when'),
    _ = require('underscore'),
    AmmoBaseObject = require('./ammo_base_object');

function AmmoVehicle(proxy, vehicleId, rigidBody) {
  this.proxy = proxy;
  this.vehicleId = vehicleId;
  this.wheelBindings = {};
  this.rigidBody = rigidBody;
}

AmmoVehicle.prototype = new AmmoBaseObject();

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

  var deferred = when.defer();

  this.proxy.execute('Vehicle_addWheel', descriptor, true).then(_.bind(function(wheelId) {
    deferred.resolve(wheelId);
  }, this));

  return deferred.promise;
};

AmmoVehicle.prototype.setWheelInfo = function(wheelId, properties) {
  var descriptor = {
    vehicleId: this.vehicleId,
    wheelId: wheelId,
    properties: properties
  };

  return this.proxy.execute('Vehicle_setWheelInfo', descriptor);
};

AmmoVehicle.prototype.setBrake = function(wheelId, brake) {
  var descriptor = {
    vehicleId: this.vehicleId,
    wheelId: wheelId,
    brake: brake
  };

  return this.proxy.execute('Vehicle_setBrake', descriptor);
};

AmmoVehicle.prototype.setEngineForce = function(wheelId, force) {
  var descriptor = {
    vehicleId: this.vehicleId,
    wheelId: wheelId,
    force: force
  };

  return this.proxy.execute('Vehicle_setEngineForce', descriptor);
};

AmmoVehicle.prototype.applyEngineForce = function(wheelId, force) {
  var descriptor = {
    vehicleId: this.vehicleId,
    wheelId: wheelId,
    force: force
  };

  return this.proxy.execute('Vehicle_applyEngineForce', descriptor);
};

AmmoVehicle.prototype.setSteeringValue = function(wheelId, steeringValue) {
  var descriptor = {
    vehicleId: this.vehicleId,
    wheelId: wheelId,
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

AmmoVehicle.prototype.addWheelObject = function(wheelId, object) {
  this.wheelBindings[wheelId] = this.proxy.adapter.createBinding(object, wheelId);
};

AmmoVehicle.prototype.update = function() {
  _.each(this.wheelBindings, function(binding) {
    binding.update();
  });
};

module.exports = AmmoVehicle;
