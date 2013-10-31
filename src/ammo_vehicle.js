define([],function() {
  function AmmoVehicle(proxy, vehicleId) {
    this.proxy = proxy;
    this.vehicleId = vehicleId;
    this.wheelBindings = [];
  } 

  AmmoVehicle.prototype.addWheel = function(connectionPoint, wheelDirection, wheelAxle, 
      suspensionRestLength, wheelRadius, isFrontWheel, tuning) {

    var descriptor = {
      vehicleId: this.vehicleId,
      connectionPoint: connectionPoint,
      wheelDirection: wheelDirection,
      wheelAxle: wheelAxle,
      suspensionRestLength: suspensionRestLength,
      wheelRadius: wheelRadius,
      isFrontWheel: isFrontWheel,
      tuning: tuning
    };

    return this.proxy.execute('Vehicle_addWheel', descriptor);
  };

  AmmoVehicle.prototype.setWheelInfo = function(wheelIndex, properties) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      properties: properties
    };

    return this.proxy.execute('Vehicle_setWheelInfo', descriptor);
  };

  AmmoVehicle.prototype.setBrake = function(wheelIndex, brake) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      brake: brake
    };

    return this.proxy.execute('Vehicle_setBrake', descriptor);
  };

  AmmoVehicle.prototype.applyEngineForce = function(wheelIndex, force) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      force: force
    };

    return this.proxy.execute('Vehicle_applyEngineForce', descriptor);
  };

  AmmoVehicle.prototype.setSteeringValue = function(wheelIndex, steeringValue) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      steeringValue: steeringValue
    };

    return this.proxy.execute('Vehicle_setSteeringValue', descriptor);
  };

  AmmoVehicle.prototype.destroy = function() {
    var descriptor = {
      vehicleId: this.vehicleId
    };

    return this.proxy.execute('Vehicle_destroy', descriptor);
  };

  AmmoVehicle.prototype.addWheelObject = function(wheelIndex, object) {
    // object.updateMatrixWorld();
    // object.originalScale = new THREE.Vector3();
    // object.originalScale.getScaleFromMatrix(object.matrixWorld);
    // object.matrixAutoUpdate = false;
    this.wheelBindings[wheelIndex] = this.proxy.adapter.createBinding(object, 
        this.proxy.getWheelOffset(this.vehicleId, wheelIndex));  
  };

  AmmoVehicle.prototype.update = function() {
    for (var i in this.wheelBindings) {
      if (this.wheelBindings.hasOwnProperty(i)) {
        this.wheelBindings[i].update();
        //this._updateWheel(i);//this.wheelObjects[i], i);  
      }
    }
  };

  //AmmoVehicle.prototype._updateWheel = function(wheelIndex) {
    //this.wheelBindings[wheelIndex].update();
    /*
    var pos;

    if (this.proxy && this.proxy.data) {
      pos = this.proxy.getWheelOffset(this.vehicleId, wheelIndex);

      tmpVector3.x = this.proxy.data[pos + 0];
      tmpVector3.y = this.proxy.data[pos + 1];
      tmpVector3.z = this.proxy.data[pos + 2];
      tmpQuaternion.x = this.proxy.data[pos + 3];
      tmpQuaternion.y = this.proxy.data[pos + 4];
      tmpQuaternion.z = this.proxy.data[pos + 5];
      tmpQuaternion.w = this.proxy.data[pos + 6];

      object.matrixWorld.makeRotationFromQuaternion(tmpQuaternion);
      object.matrixWorld.scale(object.originalScale);
      object.matrixWorld.setPosition(tmpVector3);
    }
    */
  //};

  return AmmoVehicle;
});
