/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  var tmpTrans;

  function Wheel(id, ammoData, vehicle) {
    AmmoObject.apply(this, arguments);
    this.type = 'btWheelInfo';
    this.vehicle = vehicle;
    this.index = -1;
  }

  Wheel.prototype = new AmmoObject();

  Wheel.prototype.update = function(data) {
    tmpTrans = this.vehicle.ammoData.getWheelTransformWS(this.index);

    data[this.offset + 0] = tmpTrans.getOrigin().x();
    data[this.offset + 1] = tmpTrans.getOrigin().y();
    data[this.offset + 2] = tmpTrans.getOrigin().z();
    data[this.offset + 3] = tmpTrans.getRotation().x();
    data[this.offset + 4] = tmpTrans.getRotation().y();
    data[this.offset + 5] = tmpTrans.getRotation().z();
    data[this.offset + 6] = tmpTrans.getRotation().w();
  };

  return Wheel;
});
