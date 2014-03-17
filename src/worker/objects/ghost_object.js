/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function GhostObject(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btGhostObject';
  }

  GhostObject.prototype.update = function(data) {
    var trans = this.ammoData.getWorldTransform();

    data[this.offset + 0] = trans.getOrigin().x();
    data[this.offset + 1] = trans.getOrigin().y();
    data[this.offset + 2] = trans.getOrigin().z();
    data[this.offset + 3] = trans.getRotation().x();
    data[this.offset + 4] = trans.getRotation().y();
    data[this.offset + 5] = trans.getRotation().z();
    data[this.offset + 6] = trans.getRotation().w();
  };

  return GhostObject;
});
