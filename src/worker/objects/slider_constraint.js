/* jshint unused: vars */

var AmmoObject = require('./ammo_object');

function SliderConstraint(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'btSliderConstraint';
}

SliderConstraint.prototype = new AmmoObject();

module.exports = SliderConstraint;
