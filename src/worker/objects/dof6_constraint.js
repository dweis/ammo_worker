/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function DOF6Constraint(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'bt6DOFConstraint';
}

DOF6Constraint.prototype = new AmmoObject();

module.exports = DOF6Constraint;
