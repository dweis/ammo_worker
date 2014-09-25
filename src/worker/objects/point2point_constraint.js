/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function Point2PointConstraint(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'btPoint2PointConstraint';
}

Point2PointConstraint.prototype = new AmmoObject();

module.exports = Point2PointConstraint;
