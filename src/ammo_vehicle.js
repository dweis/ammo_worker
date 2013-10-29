define([ ],function() {
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
    var topParent = object;
    
    this.wheelObjects[wheelIndex] = object;

    topParent = object;

    while (topParent.parent) {
      topParent = topParent.parent;
    }

    topParent.add(object); 
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

      position = object.position;
      quaternion = object.quaternion;  

      position.x = data[pos + 0];
      position.y = data[pos + 1];
      position.z = data[pos + 2];
      quaternion.x = data[pos + 3];
      quaternion.y = data[pos + 4];
      quaternion.z = data[pos + 5];
      quaternion.w = data[pos + 6];
    }
  };

  return AmmoVehicle;
});
