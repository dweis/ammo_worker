/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function Vehicle(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btRaycastVehicle';
    this.wheels = [];
  }

  Vehicle.prototype = new AmmoObject();

  Vehicle.prototype.addWheel = function(wheel) {
    this.wheels.push(wheel);
    wheel.index = this.wheels.length - 1;
  };

  return Vehicle;
});
