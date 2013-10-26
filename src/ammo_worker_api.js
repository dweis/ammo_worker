/* global importScripts */
define([], function() {
  function AmmoWorkerAPI(opts) {
    this.maxBodies = 1000;
    this.maxVehicles = 32;
    this.maxWheelsPerVehicle = 8;

    for (var i in opts) {
      if (opts.hasOwnProperty(i)) {
        this[i] = opts[i];
      }
    }
  }

  AmmoWorkerAPI.prototype = {
    init: function() {

      importScripts('./js/ammo.js');
      // import Scripts('http://assets.verold.com/verold_api/lib/ammo.js');

      this.bodies = [];
      this.vehicles = [];

      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
      this.overlappingPairCache = new Ammo.btDbvtBroadphase();
      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
          this.overlappingPairCache, this.solver, this.collisionConfiguration);

      this.fire('ready');
    },

    startSimulation: function() {
      var that = this,
          trans = new Ammo.btTransform(),
          meanDt = 0, meanDt2 = 0, frame = 1,
          last,
          bufferSize = (this.maxBodies * 7 * 8) +
                       (this.maxVehicles * this.maxWheelsPerVehicle * 7 * 8);

      this.buffers = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize)
      ];

      last = Date.now();
      this.simulationTimerId = setInterval(function() {
        var vehicle;
        var update;
        var now = Date.now();
        var dt = now - last || 1;
        var i, j;
        var pos;
        that.dynamicsWorld.stepSimulation(that.step, that.iterations);

        var alpha;
        if (meanDt > 0) {
          alpha = Math.min(0.1, dt/1000);
        } else {
          alpha = 0.1; // first run
        }
        meanDt = alpha*dt + (1-alpha)*meanDt;

        var alpha2 = 1/frame++;
        meanDt2 = alpha2*dt + (1-alpha2)*meanDt2;
        last = Date.now();

        if (that.buffers.length > 0) {
          update = new Float64Array(that.buffers.pop());
        }

        if (update && update.buffer instanceof ArrayBuffer) {
          for (i in that.bodies) {
            if (that.bodies[i]) {
              trans.setIdentity();
              that.bodies[i].getMotionState().getWorldTransform(trans);

              update[i * 7 + 0] = trans.getOrigin().x();
              update[i * 7 + 1] = trans.getOrigin().y();
              update[i * 7 + 2] = trans.getOrigin().z();
              update[i * 7 + 3] = trans.getRotation().x();
              update[i * 7 + 4] = trans.getRotation().y();
              update[i * 7 + 5] = trans.getRotation().z();
              update[i * 7 + 6] = trans.getRotation().w();
            }
          }

          for (i in that.vehicles) {
            if (that.vehicles[i]) {
              vehicle = that.vehicles[i];

              for ( j = 0; j < vehicle.getNumWheels() + 1; j++ ) {
                trans = vehicle.getWheelInfo(j).get_m_worldTransform();
                pos = (that.maxBodies * 7) + (i * that.maxWheelsPerVehicle * 7) + (j * 7);

                update[pos + 0] = trans.getOrigin().x();
                update[pos + 1] = trans.getOrigin().y();
                update[pos + 2] = trans.getOrigin().z();
                update[pos + 3] = trans.getRotation().x();
                update[pos + 4] = trans.getRotation().y();
                update[pos + 5] = trans.getRotation().z();
                update[pos + 6] = trans.getRotation().w();
              }
            }
          }

          that.fire('update', update.buffer, [update.buffer]);
          that.fire('stats', { currFPS: Math.round(1000/meanDt), allFPS: Math.round(1000/meanDt2) });
        }
      }, this.step * 1000);
    },

    stopSimulation: function() {
      if (this.simulationTimerId) {
        clearInterval(this.simulationTimerId);
      }
    },

    swap: function(buf) {
      if (buf instanceof ArrayBuffer) {
        this.buffers.push(buf);
      }
    },

    setStep: function(step) {
      this.step = step;
    },

    setIterations: function(iterations) {
      this.iterations = iterations;
    },

    setGravity: function(gravity) {
      this.dynamicsWorld.setGravity(new Ammo.btVector3(gravity.x,
        gravity.y, gravity.z));
    },


    _createCompoundShape: function(shape) {
      var compound = new Ammo.btCompoundShape(),
          localTransform = new Ammo.btTransform(),
          child,
          childShape;

      if (shape.children && shape.children.length) {
        for (var idx in shape.children) {
          if (shape.children.hasOwnProperty(idx)) {
            child = shape.children[idx];
            childShape = this._createShape(child);
            localTransform.setIdentity();
            localTransform.setOrigin(new Ammo.btVector3(child.localTransform.position.x,
                  child.localTransform.position.y, child.localTransform.position.z));
            localTransform.setRotation(new Ammo.btQuaternion(child.localTransform.rotation.x,
                  child.localTransform.rotation.y, child.localTransform.rotation.z,
                  child.localTransform.rotation.w));
            compound.addChildShape(localTransform, childShape);
          }
        }
      }

      return compound;
    },

    _createShape: function(shape) {
      var colShape;
      switch(shape.shape) {
      case 'box':
        colShape = new Ammo.btBoxShape(new Ammo.btVector3(shape.halfExtents.x,
            shape.halfExtents.y, shape.halfExtents.z));
        break;
      case 'sphere':
        colShape = new Ammo.btSphereShape(shape.radius);
        break;
      case 'staticplane':
        colShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(shape.normal.x, shape.normal.y, shape.normal.z), shape.distance);
        break;
      case 'cylinder':
        colShape = new Ammo.btCylinderShape(new Ammo.btVector3(shape.width, shape.height, shape.depth));
        break;
      case 'capsule':
        colShape = new Ammo.btCapsuleShape(shape.radius, shape.height);
        break;
      case 'cone':
        colShape = new Ammo.btConeShape(shape.radius, shape.height);
        break;
      case 'compound':
        colShape = this._createCompoundShape(shape);
        break;
      default:
        return console.error('Unknown shape: ' + shape.shape);
      }
      return colShape;
    },

    addVehicle: function(descriptor, fn) {
      var vehicleTuning = new Ammo.btVehicleTuning(),
          body = this.bodies[descriptor.bodyId],
          vehicle;

      if (!body) {
        return console.error('could not find body');
      }

      vehicleTuning.set_m_suspensionStiffness(descriptor.suspensionStiffness);
      vehicleTuning.set_m_suspensionCompression(descriptor.suspensionCompression);
      vehicleTuning.set_m_suspensionDamping(descriptor.suspensionDamping);
      vehicleTuning.set_m_maxSuspensionTravelCm(descriptor.maxSuspensionTravel);
      vehicleTuning.set_m_maxSuspensionForce(descriptor.maxSuspensionForce);

      vehicle = new Ammo.btRaycastVehicle(vehicleTuning, body, new Ammo.btDefaultVehicleRaycaster(this.dynamicsWorld));
      vehicle.tuning = vehicleTuning;

      body.setActivationState(4);
      vehicle.setCoordinateSystem(0, 1, 2);

      this.dynamicsWorld.addVehicle(vehicle);
      var idx = this.vehicles.push(vehicle) - 1;

      if (typeof fn === 'function') {
        console.log('added');
        fn(idx);
      }
    },

    removeVehicle: function(id) {
      this.dynamicsWorld.removeVehicle(this.vehicles[id]);
      delete this.vehicles[id];
    },


    addWheel: function(descriptor, fn) {
      var vehicle = this.vehicles[descriptor.vehicleId];

      if (vehicle !== undefined) {
        var tuning = vehicle.tuning,
            connectionPoint = new Ammo.btVector3(descriptor.connectionPoint.x,
                                                 descriptor.connectionPoint.y,
                                                 descriptor.connectionPoint.z),
            wheelDirection = new Ammo.btVector3(descriptor.wheelDirection.x,
                                                descriptor.wheelDirection.y,
                                                descriptor.wheelDirection.z),
            wheelAxle = new Ammo.btVector3(descriptor.wheelAxle.x,
                                           descriptor.wheelAxle.y,
                                           descriptor.wheelAxle.z);
        vehicle.addWheel(
          connectionPoint,
          wheelDirection,
          wheelAxle,
          descriptor.suspensionRestLength,
          descriptor.wheelRadius,
          tuning,
          descriptor.isFrontWheel
        );

        if (typeof fn === 'function') {
          fn(vehicle.getNumWheels() - 1);
        }
      }
    },

    setSteeringValue: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        this.vehicles[descriptor.vehicleId].setSteeringValue(descriptor.steering, descriptor.wheel);
      }
    },

    setBrake: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        this.vehicles[descriptor.vehicleId].setBrake(descriptor.brake, descriptor.wheel);
      }
    },

    setWheelInfo: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        var info = this.vehicles[descriptor.vehicleId].getWheelInfo(descriptor.wheel);

        if (descriptor.suspensionStiffness) {
          info.set_m_suspensionStiffness(descriptor.suspensionStiffness);
        }

        if (descriptor.wheelsDampingRelaxation) {
          info.set_m_wheelsDampingRelaxation(descriptor.wheelsDampingRelaxation);
        }

        if (descriptor.wheelsDampingCompression) {
          info.set_m_wheelsDampingCompression(descriptor.wheelsDampingCompression);
        }

        if (descriptor.frictionSlip) {
          info.set_m_frictionSlip(descriptor.frictionSlip);
        }

        if (descriptor.rollInfluence) {
          info.set_m_rollInfluence(descriptor.rollInfluence);
        }
      }
    },

    applyEngineForce: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        //this.vehicles[descriptor.vehicleId].setBrake(0, descriptor.wheel);
        this.vehicles[descriptor.vehicleId].applyEngineForce(descriptor.force, descriptor.wheel);
      }
    },

    addRigidBody: function(descriptor, fn) {
      var colShape,
          startTransform = new Ammo.btTransform(),
          isDynamic = (descriptor.mass !== 0),
          localInertia = new Ammo.btVector3(0, 0, 0),
          myMotionState,
          rbInfo,
          body;

      startTransform.setIdentity();

      colShape = this._createShape(descriptor.shape);

      if (isDynamic) {
        colShape.calculateLocalInertia(descriptor.mass,localInertia);
      }

      startTransform.setOrigin(new Ammo.btVector3(descriptor.position.x, descriptor.position.y, descriptor.position.z));
      startTransform.setRotation(new Ammo.btQuaternion(descriptor.quaternion.x, descriptor.quaternion.y, descriptor.quaternion.z, descriptor.quaternion.w));

      myMotionState = new Ammo.btDefaultMotionState(startTransform);
      rbInfo = new Ammo.btRigidBodyConstructionInfo(descriptor.mass, myMotionState, colShape, localInertia);
      body = new Ammo.btRigidBody(rbInfo);

      this.dynamicsWorld.addRigidBody(body);

      var idx = this.bodies.push(body) - 1;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    setRestition: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setRestitution(descriptor.restitution);
      }
    },

    setFriction: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setFriction(descriptor.friction);
      }
    },

    removeRigidBody: function(id) {
      this.dynamicsWorld.removeRigidBody(this.bodies[id]);
      Ammo.destroy(this.bodies[id]);
    },

    shutdown: function() {
      Ammo.destroy(this.collisionConfiguration);
      Ammo.destroy(this.dispatcher);
      Ammo.destroy(this.overlappingPairCache);
      Ammo.destroy(this.solver);
    }
  };

  return AmmoWorkerAPI;
});
