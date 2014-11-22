/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function HingeConstraint(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'btHingeConstraint';
}

HingeConstraint.prototype = new AmmoObject();

module.exports = HingeConstraint;
