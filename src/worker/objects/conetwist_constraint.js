/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function ConeTwistConstraint(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btConeTwistConstraint';
  }

  ConeTwistConstraint.prototype = new AmmoObject();

  return ConeTwistConstraint;
});
