/* jshint unused:vars */
var AmmoObject = require('./ammo_object');

function GhostObject(id, ammoData, worker) {
  AmmoObject.apply(this, arguments);
  this.type = 'btGhostObject';
}

GhostObject.prototype.update = function(data) {
  var trans = this.ammoData.getWorldTransform();

  var position = trans.getOrigin().op_mul(this.worker.scaleFactor);

  data[this.offset + 0] = position.x();
  data[this.offset + 1] = position.y();
  data[this.offset + 2] = position.z();
  data[this.offset + 3] = trans.getRotation().x();
  data[this.offset + 4] = trans.getRotation().y();
  data[this.offset + 5] = trans.getRotation().z();
  data[this.offset + 6] = trans.getRotation().w();

  Ammo.destroy(position);
};

module.exports = GhostObject;
