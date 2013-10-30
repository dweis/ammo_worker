define([ ],function() {
  var tmpVector3 = new THREE.Vector3();
  var tmpQuaternion = new THREE.Quaternion();

  function AmmoVehicle(proxy, vehicleId) {
    this.proxy = proxy;
    this.vehicleId = vehicleId;
    this.wheelObjects = [];
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
    object.updateMatrixWorld();
    object.originalScale = new THREE.Vector3();
    object.originalScale.getScaleFromMatrix(object.matrixWorld);
    object.matrixAutoUpdate = false;

    this.wheelObjects[wheelIndex] = object;
  };

  AmmoVehicle.prototype.update = function() {
    for (var i in this.wheelObjects) {
      if (this.wheelObjects.hasOwnProperty(i)) {
        this._updateWheel(this.wheelObjects[i], i);  
      }
    }
  };

  AmmoVehicle.prototype._updateWheel = function(object, wheelIndex) {
    var position, quaternion, pos, data = this.proxy.data;

    if (data) {
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
  };

  return AmmoVehicle;
});
