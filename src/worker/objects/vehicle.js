/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

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

module.exports = Vehicle;
