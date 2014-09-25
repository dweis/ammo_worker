/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function CollisionObject(id, ammoData) {
  AmmoObject.apply(this, arguments);
  this.type = 'btCollisionObject';
}

CollisionObject.prototype = new AmmoObject();

module.exports = CollisionObject;
