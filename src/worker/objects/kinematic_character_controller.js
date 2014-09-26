/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function KinematicCharacterController(id, ammoData, worker) {
  AmmoObject.apply(this, arguments);
  this.type = 'btKinematicCharacterController';
}

KinematicCharacterController.prototype = new AmmoObject();

KinematicCharacterController.prototype.update = function(data) {
  var trans = this.ammoData.getGhostObject().getWorldTransform();
  data[this.offset + 0] = trans.getOrigin().x() * this.worker.scaleFactor;
  data[this.offset + 1] = trans.getOrigin().y() * this.worker.scaleFactor;
  data[this.offset + 2] = trans.getOrigin().z() * this.worker.scaleFactor;
  data[this.offset + 3] = trans.getRotation().x();
  data[this.offset + 4] = trans.getRotation().y();
  data[this.offset + 5] = trans.getRotation().z();
  data[this.offset + 6] = trans.getRotation().w();
};

module.exports = KinematicCharacterController;
