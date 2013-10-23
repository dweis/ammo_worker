(function() {

  function AmmoWorker(opts) {
    var context = this, i, apiMethods = [
          'on', 'fire', 'addRigidBody', 'swap',
          'setStep', 'setIterations', 'setGravity',
          'startSimulation', 'stopSimulation',
          'addVehicle', 'removeVehicle', 'addWheel',
          'applyEngineForce'
        ];

    opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0},
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.memory = opts.memory || 256 * 1024 * 1024;
    opts.maxBodies = opts.maxBodies || 1000;
    opts.maxVehicles = opts.maxVehicles || 32;
    opts.maxWheelsPerVehicle = opts.maxWheelsPerVehicle || 8;

    this.worker = cw(new AmmoWorkerAPI(opts));

    function proxyMethod(method) {
      context[method] = function() {
        return context.worker[method].apply(context.worker, arguments);
      };
    }

    for (i in apiMethods) {
      if (apiMethods.hasOwnProperty(i)) {
        proxyMethod(apiMethods[i]);
      }
    }

    this.setStep(opts.step);
    this.setIterations(opts.iterations);
    this.setGravity(opts.gravity);
  }

  function AmmoWorkerAPI(opts) {
    this.memory = 1024 * 1024 * 1024;
    this.maxBodies = 1000;
    this.maxVehicles = 32;
    this.maxWheelsPerVehicle = 8;

    for (var i in opts) {
      this[i] = opts[i];
    }
  }

  AmmoWorker.prototype.getShapeJSON = function(o) {
    var inverseParent = new THREE.Matrix4(),
        tmpMatrix = new THREE.Matrix4();

    var json = {
      'shape': 'compound',
      'children': [
      ]
    };

    inverseParent.getInverse(o.matrixWorld);

    o.traverse(function(o) {
      if (o instanceof THREE.Mesh) {
        var min, max, halfExtents, tmpVec3 = new THREE.Vector3(),
        position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        worldTransform = o.matrixWorld.clone(),
        scale = new THREE.Vector3();

        tmpMatrix.copy(inverseParent);
        tmpMatrix.multiply(worldTransform);

        position.getPositionFromMatrix(tmpMatrix);
        scale.getScaleFromMatrix(worldTransform);
        tmpMatrix.extractRotation(tmpMatrix);
        rotation.setFromRotationMatrix(tmpMatrix);

        o.geometry.computeBoundingBox();
        min = o.geometry.boundingBox.min.clone();
        max = o.geometry.boundingBox.max.clone();

        tmpVec3.subVectors(max, min);
        tmpVec3.multiplyScalar(0.5);

        tmpVec3.multiplyVectors(tmpVec3, scale);
        halfExtents = tmpVec3;

        var center = new THREE.Vector3();
        center.x = ( min.x + max.x ) / 2;
        center.y = ( min.y + max.y ) / 2;
        center.z = ( min.z + max.z ) / 2;
        center.multiplyVectors(center, scale);

        json.children.push({
          shape: 'box',
          halfExtents: {
            x: halfExtents.x,
            y: halfExtents.y,
            z: halfExtents.z
          },
          localTransform: {
            position: {
              x: position.x,
              y: position.y,
              z: position.z
            },
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z,
              w: rotation.w
            }
          }
        });
      }
    });

    return json;
  };

  AmmoWorkerAPI.prototype = {
    init: function() {
      var Module = { TOTAL_MEMORY: this.memory },
          that = this;

      importScripts('./js/ammo.js');
      //'http://assets.verold.com/verold_api/lib/ammo.js'
      //'./js/ammo.js'

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
        var update;
        var now = Date.now();
        var dt = now - last || 1;
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
          for (var i in that.bodies) {
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

    swap: function(buf, cb) {
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
        var wheel = vehicle.addWheel(
          connectionPoint,
          wheelDirection,
          wheelAxle,
          descriptor.suspensionRestLength,
          descriptor.wheelRadius,
          tuning,
          descriptor.isFrontWheel
        );
      }

      if (typeof fn === 'function') {
        fn();
      }
    },

    setSteering: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        this.vehicles[descriptor.vehicleId].setSteeringValue(descriptor.steering, descriptor.wheel);
      }
    },

    setBrake: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        this.vehicles[descriptor.vehicleId].setBrake(descriptor.brake, descriptor.wheel);
      }
    },

    applyEngineForce: function(descriptor) {
      if (this.vehicles[descriptor.vehicleId] !== undefined) {
        this.vehicles[descriptor.vehicleId].applyEngineForce(descriptor.force, descriptor.wheel);
      }
    },

    addRigidBody: function(descriptor, fn) {
      var colShape,
          startTransform = new Ammo.btTransform(),
          isDynamic = (descriptor.mass != 0),
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

      body.setRestitution(descriptor.restitution);
      body.setFriction(descriptor.friction);

      this.dynamicsWorld.addRigidBody(body);

      var idx = this.bodies.push(body) - 1;

      if (typeof fn === 'function') {
        fn(idx);
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

  window.AmmoWorker = AmmoWorker;
})();
