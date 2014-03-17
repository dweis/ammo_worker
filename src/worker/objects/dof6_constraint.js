/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function DOF6Constraint(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'bt6DOFConstraint';
  }

  DOF6Constraint.prototype = new AmmoObject();

  return DOF6Constraint;
});
