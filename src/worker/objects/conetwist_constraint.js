/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function ConeTwistConstraint(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'btConeTwistConstraint';
}

ConeTwistConstraint.prototype = new AmmoObject();

module.exports = ConeTwistConstraint;
