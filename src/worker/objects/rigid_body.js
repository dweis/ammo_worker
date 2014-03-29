/* jshint unused:vars */
define([ 'worker/objects/collision_object' ], function(CollisionObject) {
  var tmpTrans = new Ammo.btTransform();

  function RigidBody(id, ammoData) {
    CollisionObject.apply(this, arguments);
    this.type = 'btRigidBody';
  }

  RigidBody.prototype = new CollisionObject();

  RigidBody.prototype.update = function(data) {
    tmpTrans.setIdentity();

    this.ammoData.getMotionState().getWorldTransform(tmpTrans);

    data[this.offset + 0] = tmpTrans.getOrigin().x();
    data[this.offset + 1] = tmpTrans.getOrigin().y();
    data[this.offset + 2] = tmpTrans.getOrigin().z();
    data[this.offset + 3] = tmpTrans.getRotation().x();
    data[this.offset + 4] = tmpTrans.getRotation().y();
    data[this.offset + 5] = tmpTrans.getRotation().z();
    data[this.offset + 6] = tmpTrans.getRotation().w();
  };

  return RigidBody;
});
