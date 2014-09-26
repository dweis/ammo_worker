var ActivationStates = require('../constants/activation_states'),
    Vehicle = require('../objects/vehicle'),
    Wheel = require('../objects/wheel');

var tmpVec = [
    new Ammo.btVector3(),
    new Ammo.btVector3(),
    new Ammo.btVector3(),
  ];

module.exports = {
  Vehicle_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused transforms left!');
    }

    var vehicleTuning = new Ammo.btVehicleTuning(),
        body = this.objects[descriptor.bodyId],
        vehicle;

    if (!body) {
      return console.error('could not find body');
    }

    if (descriptor.tuning) {
      if (descriptor.tuning.suspensionStiffness) {
        vehicleTuning.set_m_suspensionStiffness(descriptor.tuning.suspensionStiffness);
      }

      if (descriptor.tuning.suspensionCompression) {
        vehicleTuning.set_m_suspensionCompression(descriptor.tuning.suspensionCompression);
      }

      if (descriptor.tuning.suspensionDamping) {
        vehicleTuning.set_m_suspensionDamping(descriptor.tuning.suspensionDamping);
      }

      if (descriptor.tuning.maxSuspensionTravelCm) {
        vehicleTuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm / this.scaleFactor);
      }

      if (descriptor.tuning.maxSuspensionForce) {
        vehicleTuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
      }

      if (descriptor.tuning.frictionSlip) {
        vehicleTuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
      }
    }

    vehicle = new Ammo.btRaycastVehicle(vehicleTuning, body.ammoData, new Ammo.btDefaultVehicleRaycaster(this.dynamicsWorld));
    vehicle.tuning = vehicleTuning;

    body.ammoData.setActivationState(ActivationStates.DISABLE_DEACTIVATION);
    vehicle.setCoordinateSystem(0, 1, 2);

    this.dynamicsWorld.addAction(vehicle);

    var id = this.ids.pop();

    vehicle.userData = {
      type: 'btRaycastVehicle',
      id: id
    };

    var obj = new Vehicle(id, vehicle, this);

    this.objects[id] = obj;

    if (typeof fn === 'function') {
      fn(id);
    }
  },

  Vehicle_addWheel: function(descriptor, fn) {
    var vehicle = this.objects[descriptor.vehicleId];

    if (!this.ids.length) {
      return console.error('No unused transforms left!');
    }

    if (vehicle !== undefined) {
      var tuning = vehicle.ammoData.tuning,
          connectionPoint = tmpVec[0],
          wheelDirection = tmpVec[1],
          wheelAxle = tmpVec[2];

      if (typeof descriptor.tuning === 'object') {
        tuning = new Ammo.btVehicleTuning();

        if (descriptor.tuning.suspensionStiffness) {
          tuning.set_m_suspensionStiffness(descriptor.tuning.suspensionStiffness);
        }

        if (descriptor.tuning.suspensionCompression) {
          tuning.set_m_suspensionCompression(descriptor.tuning.suspensionCompression);
        }

        if (descriptor.tuning.suspensionDamping) {
          tuning.set_m_suspensionDamping(descriptor.tuning.suspensionDamping);
        }

        if (descriptor.tuning.maxSuspensionTravelCm) {
          tuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm / this.scaleFactor);
        }

        if (descriptor.tuning.maxSuspensionForce) {
          tuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
        }

        if (descriptor.tuning.frictionSlip) {
          tuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
        }
      }

      connectionPoint.setX(descriptor.connectionPoint.x / this.scaleFactor);
      connectionPoint.setY(descriptor.connectionPoint.y / this.scaleFactor);
      connectionPoint.setZ(descriptor.connectionPoint.z / this.scaleFactor);

      wheelDirection.setX(descriptor.wheelDirection.x);
      wheelDirection.setY(descriptor.wheelDirection.y);
      wheelDirection.setZ(descriptor.wheelDirection.z);

      wheelAxle.setX(descriptor.wheelAxle.x);
      wheelAxle.setY(descriptor.wheelAxle.y);
      wheelAxle.setZ(descriptor.wheelAxle.z);

      var wheelInfo = vehicle.ammoData.addWheel(
        connectionPoint,
        wheelDirection,
        wheelAxle,
        descriptor.suspensionRestLength / this.scaleFactor,
        descriptor.wheelRadius / this.scaleFactor,
        tuning,
        descriptor.isFrontWheel
      );

      var id = this.ids.pop();

      var obj = new Wheel(id, wheelInfo, this, vehicle);

      vehicle.addWheel(obj);

      this.objects[id] = obj;

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },

  Vehicle_setSteeringValue: function(descriptor) {
    var vehicle = this.objects[descriptor.vehicleId];

    if (vehicle) {
      vehicle.ammoData.setSteeringValue(descriptor.steeringValue, descriptor.wheelId);
    }
  },

  Vehicle_setBrake: function(descriptor) {
    var vehicle = this.objects[descriptor.vehicleId];

    if (vehicle) {
      vehicle.ammoData.setBrake(descriptor.brake, descriptor.wheelId);
    }
  },

  Vehicle_setWheelInfo: function(descriptor) {
    var vehicle = this.objects[descriptor.vehicleId],
        info;

    if (vehicle) {
      info = vehicle.ammoData.getWheelInfo(descriptor.wheelId);

      for (var i in descriptor.properties) {
        if (descriptor.properties.hasOwnProperty(i)) {
          try {
            info['set_m_' + i](descriptor.properties[i]);
          } catch(e) {
            console.log('Failed to set for: ' + i);
          }
        }
      }
    }
  },

  Vehicle_setEngineForce: function(descriptor) {
    var vehicle = this.objects[descriptor.vehicleId],
        wheel;

    if (vehicle) {
      wheel = vehicle.wheels[descriptor.wheelId];

      if (wheel) {
        wheel.force = descriptor.force / this.scaleFactor;
      }
    }
  },

  Vehicle_applyEngineForce: function(descriptor) {
    var vehicle = this.objects[descriptor.vehicleId];

    if (vehicle) {
      vehicle.ammoData.applyEngineForce(descriptor.force / this.scaleFactor, descriptor.wheelId);
    }
  },

  Vehicle_destroy: function(descriptor) {
    var id = descriptor.vehicleId,
        vehicle = this.objects[id];

    if (vehicle) {
      this.dynamicsWorld.removeVehicle(vehicle);
      Ammo.destroy(vehicle.ammoData);
      this.objects[id] = undefined;
      this.trigger('destroy', id);
      this.ids.push(id);
    }
  }
};
