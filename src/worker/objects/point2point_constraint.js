/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function Point2PointConstraint(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btPoint2PointConstraint';
  }

  Point2PointConstraint.prototype = new AmmoObject();

  return Point2PointConstraint;
});
