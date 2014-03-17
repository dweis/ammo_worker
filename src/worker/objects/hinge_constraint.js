/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function HingeConstraint(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btHingeConstraint';
  }

  HingeConstraint.prototype = new AmmoObject();

  return HingeConstraint;
});
