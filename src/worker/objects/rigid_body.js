/* jshint unused:vars */
var CollisionObject = require('./collision_object');

var tmpTrans = new Ammo.btTransform();

function RigidBody(id, ammoData, worker) {
  CollisionObject.apply(this, arguments);
  this.type = 'btRigidBody';
}

RigidBody.prototype = new CollisionObject();

RigidBody.prototype.update = function(data) {
  tmpTrans.setIdentity();

  this.ammoData.getMotionState().getWorldTransform(tmpTrans);

  var position = tmpTrans.getOrigin().op_mul(this.worker.scaleFactor);

  data[this.offset + 0] = position.x();
  data[this.offset + 1] = position.y();
  data[this.offset + 2] = position.z();
  data[this.offset + 3] = tmpTrans.getRotation().x();
  data[this.offset + 4] = tmpTrans.getRotation().y();
  data[this.offset + 5] = tmpTrans.getRotation().z();
  data[this.offset + 6] = tmpTrans.getRotation().w();

  Ammo.destroy(position);
};

module.exports = RigidBody;
