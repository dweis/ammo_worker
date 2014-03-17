/* jshint unused: vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function SliderConstraint(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btSliderConstraint';
  }

  SliderConstraint.prototype = new AmmoObject();

  return SliderConstraint;
});
