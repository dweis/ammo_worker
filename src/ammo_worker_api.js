/* global importScripts */
define([], function() {
  "use strict";

  function AmmoWorkerAPI(opts) {
    this.maxBodies = 1000;
    this.maxVehicles = 32;
    this.maxWheelsPerVehicle = 8;
    this.maxKinematicCharacterControllers = 16;

    for (var i in opts) {
      if (opts.hasOwnProperty(i)) {
        this[i] = opts[i];
      }
    }
  }

  AmmoWorkerAPI.prototype = {
    collisionFlags: {
      CF_STATIC_OBJECT: 1, 
      CF_KINEMATIC_OBJECT: 2, 
      CF_NO_CONTACT_RESPONSE: 4, 
      CF_CUSTOM_MATERIAL_CALLBACK: 8, 
      CF_CHARACTER_OBJECT: 16, 
      CF_DISABLE_VISUALIZE_OBJECT: 32, 
      CF_DISABLE_SPU_COLLISION_PROCESSING: 64 
    },

    activationStates: {
      ACTIVE_TAG: 1,
      ISLAND_SLEEPING: 2,
      WANTS_DEACTIVATION: 3,
      DISABLE_DEACTIVATION: 4,
      DISABLE_SIMULATION: 5
    }, 

    collisionFilterGroups:  {
      DefaultFilter: 1,
      StaticFilter: 2,
      KinematicFilter: 4,
      DebrisFilter: 8,
      SensorTrigger: 16,
      CharacterFilter: 32,
      AllFilter: -1 //all bits sets: DefaultFilter | StaticFilter | KinematicFilter | DebrisFilter | SensorTrigger
    },

    init: function() {
      var bufferSize = (this.maxBodies * 7 * 8) + (this.maxVehicles * this.maxWheelsPerVehicle * 7 * 8) +
          (this.maxKinematicCharacterControllers * 7);

      //import Scripts('./js/ammo.js');
      importScripts('http://assets.verold.com/verold_api/lib/ammo.js');

      this.tmpVec = [
        new Ammo.btVector3(),
        new Ammo.btVector3(),
        new Ammo.btVector3(),
        new Ammo.btVector3()
      ];

      this.tmpQuaternion = [
        new Ammo.btQuaternion(),
        new Ammo.btQuaternion()
      ];

      this.tmpTrans = [
        new Ammo.btTransform(),
        new Ammo.btTransform()
      ];

      this.bodies = [];
      this.vehicles = [];
      this.constraints = [];
      this.ghosts = [];
      this.characterControllers = [];

      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);

      this.overlappingPairCache = new Ammo.btDbvtBroadphase();

      /*
      this.tmpVec[0].setX(-1000);
      this.tmpVec[0].setY(-1000);
      this.tmpVec[0].setZ(-1000);
      this.tmpVec[1].setX(1000);
      this.tmpVec[1].setY(1000);
      this.tmpVec[1].setZ(1000);
      this.overlappingPairCache = new Ammo.btAxisSweep3(this.tmpVec[0], this.tmpVec[1]);
      */
      
      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
          this.overlappingPairCache, this.solver, this.collisionConfiguration);

      this.ghostPairCallback = new Ammo.btGhostPairCallback();
      this.dynamicsWorld.getPairCache().setInternalGhostPairCallback(this.ghostPairCallback);

      this.dynamicsWorld.getDispatchInfo().set_m_allowedCcdPenetration(0.0001);
      console.log('1');

      this.buffers = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize)
      ];

      this.fire('ready');
    },

    getStats: function(undefined, fn) {
      return fn({
        totalTime: this.totalTime,
        frames: this.frames,
        fps: this.fps,
        buffersReady: this.buffers.length
      });
    },

    startSimulation: function() {
      var that = this, last = Date.now();

      that.totalTime = 0;
      that.frames = 0;

      this.simulationTimerId = setInterval(function() {
        var vehicle, update, i, j, pos, now = Date.now(),
            delta = (now - last) / 1000;


        that.dynamicsWorld.stepSimulation(delta/*that.step*/, that.iterations, that.step);

        if (that.buffers.length > 0) {
          update = new Float64Array(that.buffers.pop());
        }

        if (update && update.buffer instanceof ArrayBuffer) {
          for (i in that.bodies) {
            if (that.bodies[i]) {
              that.tmpTrans[0].setIdentity();
              that.bodies[i].getMotionState().getWorldTransform(that.tmpTrans[0]);

              update[i * 7 + 0] = that.tmpTrans[0].getOrigin().x();
              update[i * 7 + 1] = that.tmpTrans[0].getOrigin().y();
              update[i * 7 + 2] = that.tmpTrans[0].getOrigin().z();
              update[i * 7 + 3] = that.tmpTrans[0].getRotation().x();
              update[i * 7 + 4] = that.tmpTrans[0].getRotation().y();
              update[i * 7 + 5] = that.tmpTrans[0].getRotation().z();
              update[i * 7 + 6] = that.tmpTrans[0].getRotation().w();
            }
          }

          for (i in that.vehicles) {
            if (that.vehicles[i]) {
              vehicle = that.vehicles[i];

              for ( j = 0; j < vehicle.getNumWheels() + 1; j++ ) {
                that.tmpTrans[0] = vehicle.getWheelInfo(j).get_m_worldTransform();
                pos = (that.maxBodies * 7) + (i * that.maxWheelsPerVehicle * 7) + (j * 7);

                update[pos + 0] = that.tmpTrans[0].getOrigin().x();
                update[pos + 1] = that.tmpTrans[0].getOrigin().y();
                update[pos + 2] = that.tmpTrans[0].getOrigin().z();
                update[pos + 3] = that.tmpTrans[0].getRotation().x();
                update[pos + 4] = that.tmpTrans[0].getRotation().y();
                update[pos + 5] = that.tmpTrans[0].getRotation().z();
                update[pos + 6] = that.tmpTrans[0].getRotation().w();
              }
            }
          }

          for (i in that.characterControllers) {
            if (that.characterControllers[i]) {
              var trans = that.characterControllers[i].getGhostObject().getWorldTransform();//that.tmpTrans[0]);
              pos = (that.maxBodies * 7) + (that.maxVehicles * that.maxWheelsPerVehicle * 7) + (i * 7);

              update[pos + 0] = trans.getOrigin().x();
              update[pos + 1] = trans.getOrigin().y();
              update[pos + 2] = trans.getOrigin().z();
              update[pos + 3] = trans.getRotation().x();
              update[pos + 4] = trans.getRotation().y();
              update[pos + 5] = trans.getRotation().z();
              update[pos + 6] = trans.getRotation().w();
            }  
          }

          that.ghosts.forEach(function(ghost/*, idx*/) {
            var pairCache = Ammo.castObject(ghost.getOverlappingPairCache(), Ammo.btOverlappingPairCache);

            var num = pairCache.getNumOverlappingPairs();

            if (num > 0) {
              // TODO: figure this out
            }
          }.bind(this));

          that.fire('update', update.buffer, [update.buffer]);
          that.frames ++;

          last = now;
          that.totalTime += delta;
          that.fps = Math.round( that.frames / that.totalTime );
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
      this.tmpVec[0].setX(gravity.x);
      this.tmpVec[0].setY(gravity.y);
      this.tmpVec[0].setZ(gravity.z);
      this.dynamicsWorld.setGravity(this.tmpVec[0]);
    },

    _createCompoundShape: function(shape) {
      var compound = new Ammo.btCompoundShape(),
          localTransform = this.tmpTrans[0],
          child,
          childShape;

      if (shape.children && shape.children.length) {
        for (var idx in shape.children) {
          if (shape.children.hasOwnProperty(idx)) {
            child = shape.children[idx];
            childShape = this._createShape(child);
            localTransform.setIdentity();
            this.tmpVec[0].setX(child.localTransform.position.x);
            this.tmpVec[0].setY(child.localTransform.position.y);
            this.tmpVec[0].setZ(child.localTransform.position.z);
            localTransform.setOrigin(this.tmpVec[0]);
            this.tmpQuaternion[0].setX(child.localTransform.rotation.x);
            this.tmpQuaternion[0].setY(child.localTransform.rotation.y);
            this.tmpQuaternion[0].setZ(child.localTransform.rotation.z);
            this.tmpQuaternion[0].setW(child.localTransform.rotation.w);
            localTransform.setRotation(this.tmpQuaternion[0]);
            compound.addChildShape(localTransform, childShape);
          }
        }
      }

      return compound;
    },

    _createConvexHullMeshShape: function(shape) {
      var colShape;

      if (!shape.vertices) {
        throw new Error('You must supply a list of vertices!');
      }

      colShape = new Ammo.btConvexHullShape();

      for (var i = 0; i < shape.vertices.length/3; i+=3) {
        this.tmpVec[0].setX(shape.vertices[i*3+0]);
        this.tmpVec[0].setY(shape.vertices[i*3+1]);
        this.tmpVec[0].setZ(shape.vertices[i*3+2]);
        colShape.addPoint(this.tmpVec[0]); 
      }

      return colShape;
    },

    _createTriangleMeshShape: function(shape, type) {
      var i, mesh, className;

      if (!shape.triangles) {
        throw new Error('You must supply a list of triangles!');
      }

      switch (type) {
        case 'bvh':
          className = 'btBvhTriangleMeshShape';
          break;

        case 'convex':
          className = 'btConvexTriangleMeshShape';
          break;

        default:
          throw new Error('You must supply a valid mesh type!');
      }

      mesh = new Ammo.btTriangleMesh(true, true);

      for (i = 0; i < shape.triangles.length/9; i ++) {
        this.tmpVec[0].setX(shape.triangles[i * 9 + 0]);
        this.tmpVec[0].setY(shape.triangles[i * 9 + 1]);
        this.tmpVec[0].setZ(shape.triangles[i * 9 + 2]);

        this.tmpVec[1].setX(shape.triangles[i * 9 + 3]);
        this.tmpVec[1].setY(shape.triangles[i * 9 + 4]);
        this.tmpVec[1].setZ(shape.triangles[i * 9 + 5]);

        this.tmpVec[2].setX(shape.triangles[i * 9 + 6]);
        this.tmpVec[2].setY(shape.triangles[i * 9 + 7]);
        this.tmpVec[2].setZ(shape.triangles[i * 9 + 8]);

        mesh.addTriangle(this.tmpVec[0], this.tmpVec[1], this.tmpVec[2], false);
      }

      return new Ammo[className](mesh, true, true);
    },

    _createShape: function(shape) {
      var colShape;
      switch(shape.shape) {
      case 'box':
        this.tmpVec[0].setX(shape.halfExtents.x);
        this.tmpVec[0].setY(shape.halfExtents.y);
        this.tmpVec[0].setZ(shape.halfExtents.z);
        colShape = new Ammo.btBoxShape(this.tmpVec[0]);
        break;
      case 'sphere':
        colShape = new Ammo.btSphereShape(shape.radius);
        break;
      case 'staticplane':
        this.tmpVec[0].setX(shape.normal.x);
        this.tmpVec[0].setY(shape.normal.y);
        this.tmpVec[0].setZ(shape.normal.z);
        colShape = new Ammo.btStaticPlaneShape(this.tmpVec[0], shape.distance);
        break;
      case 'cylinder':
        this.tmpVec[0].setX(shape.width);
        this.tmpVec[0].setY(shape.height);
        this.tmpVec[0].setZ(shape.depth);
        colShape = new Ammo.btCylinderShape(this.tmpVec[0]);
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
      case 'convex_hull_mesh':
        colShape = this._createConvexHullMeshShape(shape);
        break;
      case 'convex_triangle_mesh':
        colShape = this._createTriangleMeshShape(shape, 'convex');
        break;
      case 'bvh_triangle_mesh':
        colShape = this._createTriangleMeshShape(shape, 'bvh');
        break;
      default:
        return console.error('Unknown shape: ' + shape.shape);
      }
      return colShape;
    },

    Broadphase_aabbTest: function(descriptor, fn) {
      var that = this;

      if (!this.aabbCallback) {
        this.aabbCallback = new Ammo.ConcreteBroadphaseAabbCallback();
        this.aabbCallback.bodies = [];

        (function() {
          Ammo.customizeVTable(that.aabbCallback, [{
            original: Ammo.ConcreteBroadphaseAabbCallback.prototype.process,
            replacement: function(thisPtr, proxyPtr) {
              var proxy = Ammo.wrapPointer(proxyPtr, Ammo.btBroadphaseProxy);
              var clientObject = Ammo.wrapPointer(proxy.get_m_clientObject(), Ammo.btRigidBody);
              var _this = Ammo.wrapPointer(thisPtr, Ammo.ConcreteBroadphaseAabbCallback);

              if (clientObject.id) {
                _this.bodies.push(clientObject.id);
              }

              return true;
            }
          }]);
        })();
      }

      this.tmpVec[0].setX(descriptor.min.x);
      this.tmpVec[0].setY(descriptor.min.y);
      this.tmpVec[0].setZ(descriptor.min.z);

      this.tmpVec[1].setX(descriptor.max.x);
      this.tmpVec[1].setY(descriptor.max.y);
      this.tmpVec[1].setZ(descriptor.max.z);

      this.aabbCallback.bodies = [];
      this.dynamicsWorld
        .getBroadphase()
        .aabbTest(this.tmpVec[0], this.tmpVec[1],
          this.aabbCallback);

      fn(this.aabbCallback.bodies);
    },

    Vehicle_create: function(descriptor, fn) {
      var vehicleTuning = new Ammo.btVehicleTuning(),
          body = this.bodies[descriptor.bodyId],
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
          vehicleTuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm);
        }

        if (descriptor.tuning.maxSuspensionForce) {
          vehicleTuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
        }

        if (descriptor.tuning.frictionSlip) {
          vehicleTuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
        }
      }

      vehicle = new Ammo.btRaycastVehicle(vehicleTuning, body, new Ammo.btDefaultVehicleRaycaster(this.dynamicsWorld));
      vehicle.tuning = vehicleTuning;

      body.setActivationState(this.activationStates.DISABLE_DEACTIVATION);
      vehicle.setCoordinateSystem(0, 1, 2);

      this.dynamicsWorld.addVehicle(vehicle);
      var idx = this.vehicles.push(vehicle) - 1;
      vehicle.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    Vehicle_addWheel: function(descriptor, fn) {
      var vehicle = this.vehicles[descriptor.vehicleId];

      if (vehicle !== undefined) {
        var tuning = vehicle.tuning,
            connectionPoint = this.tmpVec[0],
            wheelDirection = this.tmpVec[1],
            wheelAxle = this.tmpVec[2];


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
            tuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm);
          }

          if (descriptor.tuning.maxSuspensionForce) {
            tuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
          }

          if (descriptor.tuning.frictionSlip) {
            tuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
          }
        } 

        connectionPoint.setX(descriptor.connectionPoint.x);
        connectionPoint.setY(descriptor.connectionPoint.y);
        connectionPoint.setZ(descriptor.connectionPoint.z);

        wheelDirection.setX(descriptor.wheelDirection.x);
        wheelDirection.setY(descriptor.wheelDirection.y);
        wheelDirection.setZ(descriptor.wheelDirection.z);

        wheelAxle.setX(descriptor.wheelAxle.x);
        wheelAxle.setY(descriptor.wheelAxle.y);
        wheelAxle.setZ(descriptor.wheelAxle.z);

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

    Vehicle_setSteeringValue: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].setSteeringValue(descriptor.steeringValue, descriptor.wheelIndex);
      }
    },

    Vehicle_setBrake: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].setBrake(descriptor.brake, descriptor.wheelIndex);
      }
    },

    Vehicle_setWheelInfo: function(descriptor) {  
      var vehicle = this.vehicles[descriptor.vehicleId],
          info;
      if (vehicle) {

        info = this.vehicles[descriptor.vehicleId].getWheelInfo(descriptor.wheelIndex);

        for (var i in descriptor.properties) {
          if (descriptor.properties.hasOwnProperty(i)) {
            info['set_m_' + i](descriptor.properties[i]); 
          }
        }
      }
    },

    Vehicle_applyEngineForce: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].applyEngineForce(descriptor.force, descriptor.wheelIndex);
      }
    },

    Point2PointConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        this.tmpVec[0].setX(descriptor.pivotA.x);
        this.tmpVec[0].setY(descriptor.pivotA.y);
        this.tmpVec[0].setZ(descriptor.pivotA.z); 

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          this.tmpVec[1].setX(descriptor.pivotB.x);
          this.tmpVec[1].setY(descriptor.pivotB.y);
          this.tmpVec[1].setZ(descriptor.pivotB.z); 
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB, this.tmpVec[0], this.tmpVec[1]);
        } else {
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB);
        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    SliderConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        var transformA = new Ammo.btTransform();

        this.tmpVec[0].setX(descriptor.frameInA.position.x);
        this.tmpVec[0].setY(descriptor.frameInA.position.y);
        this.tmpVec[0].setZ(descriptor.frameInA.position.z);

        this.tmpQuaternion[0].setX(descriptor.frameInA.rotation.x);
        this.tmpQuaternion[0].setY(descriptor.frameInA.rotation.y);
        this.tmpQuaternion[0].setZ(descriptor.frameInA.rotation.z);
        this.tmpQuaternion[0].setW(descriptor.frameInA.rotation.w);

        transformA.setOrigin(this.tmpVec[0]);
        transformA.setRotation(this.tmpQuaternion[0]);

        if (rigidBodyB) {
          var transformB = new Ammo.btTransform();

          this.tmpVec[1].setX(descriptor.frameInB.position.x);
          this.tmpVec[1].setY(descriptor.frameInB.position.y);
          this.tmpVec[1].setZ(descriptor.frameInB.position.z);

          this.tmpQuaternion[1].setX(descriptor.frameInB.rotation.x);
          this.tmpQuaternion[1].setY(descriptor.frameInB.rotation.y);
          this.tmpQuaternion[1].setZ(descriptor.frameInB.rotation.z);
          this.tmpQuaternion[1].setW(descriptor.frameInB.rotation.w);

          transformB.setOrigin(this.tmpVec[1]);
          transformB.setRotation(this.tmpQuaternion[1]);

          constraint = new Ammo.btSliderConstraint(rigidBodyA, rigidBodyB, 
            transformA, transformB);
        } else {

        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    SliderConstraint_setLowerLinLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLowerLinLimit(descriptor.limit);
      }
    },

    SliderConstraint_setUpperLinLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setUpperLinLimit(descriptor.limit);
      }
    },

    SliderConstraint_setLowerAngLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLowerAngLimit(descriptor.limit);
      }
    },

    SliderConstraint_setUpperAngLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setUpperAngLimit(descriptor.limit);
      }
    },

    HingeConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        this.tmpVec[0].setX(descriptor.pivotA.x);
        this.tmpVec[0].setY(descriptor.pivotA.y);
        this.tmpVec[0].setZ(descriptor.pivotA.z); 
        this.tmpVec[1].setX(descriptor.axisA.x);
        this.tmpVec[1].setX(descriptor.axisA.y);
        this.tmpVec[1].setX(descriptor.axisA.z);

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          this.tmpVec[2].setX(descriptor.pivotB.x);
          this.tmpVec[2].setY(descriptor.pivotB.y);
          this.tmpVec[2].setZ(descriptor.pivotB.z); 
          this.tmpVec[3].setX(descriptor.axisB.x);
          this.tmpVec[3].setY(descriptor.axisB.y);
          this.tmpVec[3].setZ(descriptor.axisB.z); 
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              this.tmpVec[0], this.tmpVec[2], this.tmpVec[1], this.tmpVec[3]);
        } else {
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              this.tmpVec[0], this.tmpVec[1]);
        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    HingeConstraint_setLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLimit(descriptor.low, descriptor.high, descriptor.softness,
              descriptor.biasFactor, descriptor.relaxationFactor);
      }
    },

    /*
    DynamicsWorld_rayTestAllHits: function(descriptor, fn) {
      this.tmpVec[0].setX(descriptor.rayFromWorld.x);
      this.tmpVec[0].setY(descriptor.rayFromWorld.y);
      this.tmpVec[0].setZ(descriptor.rayFromWorld.z);
      this.tmpVec[1].setX(descriptor.rayToWorld.x);
      this.tmpVec[1].setY(descriptor.rayToWorld.y);
      this.tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.AllHitsRayResultCallback(this.tmpVec[0], this.tmpVec[1]);

      this.dynamicsWorld.rayTest(this.tmpVec[0], this.tmpVec[1], callback);

      if (callback.hasHit()) {
        console.log('hits', callback.m_hitFractions.size());
      } else {
        if (typeof fn === 'function') {
          fn();
        }
      }

      Ammo.destroy(callback);
    },
    */

    DynamicsWorld_rayTestClosest: function(descriptor, fn) {
      this.tmpVec[0].setX(descriptor.rayFromWorld.x);
      this.tmpVec[0].setY(descriptor.rayFromWorld.y);
      this.tmpVec[0].setZ(descriptor.rayFromWorld.z);
      this.tmpVec[1].setX(descriptor.rayToWorld.x);
      this.tmpVec[1].setY(descriptor.rayToWorld.y);
      this.tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.ClosestRayResultCallback(this.tmpVec[0], this.tmpVec[1]);

      this.dynamicsWorld.rayTest(this.tmpVec[0], this.tmpVec[1], callback);

      if (callback.hasHit()) {
        var body = Ammo.castObject(callback.get_m_collisionObject(), Ammo.btRigidBody);

        if (body.id) {
          if (typeof fn === 'function') {
            fn({
              type: 'btRigidBody', 
              bodyId: body.id,
              hitPointWorld: {
                x: callback.get_m_hitPointWorld().x(),
                y: callback.get_m_hitPointWorld().y(),
                z: callback.get_m_hitPointWorld().z()
              },
              hitNormalWorld: {
                x: callback.get_m_hitNormalWorld().x(),
                y: callback.get_m_hitNormalWorld().y(),
                z: callback.get_m_hitNormalWorld().z()
              }
            });
          }
        }
      } else {
        if (typeof fn === 'function') {
          fn();
        }
      }

      Ammo.destroy(callback);
    },

    DynamicsWorld_addRigidBody: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.dynamicsWorld.addRigidBody(body, descriptor.group, descriptor.mask);
      }
    },

    DynamicsWorld_addGhostObject: function(descriptor) {
      var ghost = this.ghosts[descriptor.ghostId];

      if (ghost) {
        this.dynamicsWorld.addCollisionObject(ghost, descriptor.group, descriptor.mask);  
      }
    },

    GhostObject_create: function(descriptor, fn) {
      var colShape = this._createShape(descriptor.shape),
          origin = this.tmpVec[0],
          rotation = this.tmpQuaternion[0],
          ghostObject;

      if (!colShape) {
        return console.error('Invalid collision shape!');
      }

      this.tmpTrans[0].setIdentity();

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      this.tmpTrans[0].setOrigin(origin);
      this.tmpTrans[0].setRotation(rotation);

      ghostObject = new Ammo.btPairCachingGhostObject();
      ghostObject.setWorldTransform(this.tmpTrans[0]);

      ghostObject.setCollisionShape(colShape);
      ghostObject.setCollisionFlags(this.collisionFlags.CF_NO_CONTACT_RESPONSE); // no collision response 

      var idx = this.ghosts.push(ghostObject) - 1;
      ghostObject.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    KinematicCharacterController_create: function(descriptor, fn) {
      var colShape,
          startTransform = this.tmpTrans[0],
          origin = this.tmpVec[1],
          rotation = this.tmpQuaternion[0],
          ghost,
          controller;

      startTransform.setIdentity();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
      }
      console.log(descriptor);

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      startTransform.setOrigin(origin);
      startTransform.setRotation(rotation);

      ghost = new Ammo.btPairCachingGhostObject();
      ghost.setWorldTransform(startTransform);

      ghost.setCollisionShape(colShape);
      ghost.setCollisionFlags(this.collisionFlags.CF_CHARACTER_OBJECT);

      controller = new Ammo.btKinematicCharacterController (ghost, colShape, descriptor.stepHeight);

      this.dynamicsWorld.addCollisionObject(ghost, this.collisionFilterGroups.CharacterFilter,
        this.collisionFilterGroups.StaticFilter | this.collisionFilterGroups.DefaultFilter);

      this.dynamicsWorld.addAction(controller);

      var idx = this.characterControllers.push(controller) - 1;
      this.ghost = ghost;
      controller.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    KinematicCharacterController_setWalkDirection: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        this.tmpVec[0].setX(descriptor.direction.x);
        this.tmpVec[0].setY(descriptor.direction.y);
        this.tmpVec[0].setZ(descriptor.direction.z);

        controller.setWalkDirection(this.tmpVec[0]);
      }
    },

    RigidBody_create: function(descriptor, fn) {
      var colShape,
          startTransform = this.tmpTrans[0],
          isDynamic = (descriptor.mass !== 0),
          localInertia = this.tmpVec[0],
          origin = this.tmpVec[1],
          rotation = this.tmpQuaternion[0],
          myMotionState,
          rbInfo,
          body;

      startTransform.setIdentity();
      localInertia.setZero();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
      }

      if (isDynamic) {
        colShape.calculateLocalInertia(descriptor.mass,localInertia);
      }

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      startTransform.setOrigin(origin);
      startTransform.setRotation(rotation);

      myMotionState = new Ammo.btDefaultMotionState(startTransform);
      rbInfo = new Ammo.btRigidBodyConstructionInfo(descriptor.mass, myMotionState, colShape, localInertia);
      body = new Ammo.btRigidBody(rbInfo);

      var idx = this.bodies.push(body) - 1;
      body.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    RigidBody_setType: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        switch (descriptor.type) {
        case 'static':
          body.setCollisionFlags(this.collisionFlags.CF_STATIC_OBJECT);
          body.setActivationState(this.activationStates.DISABLE_SIMULATION);
          break;
        case 'kinematic':
          body.setCollisionFlags(this.collisionFlags.CF_KINEMATIC_OBJECT);
          body.setActivationState(this.activationStates.DISABLE_DEACTIVATION);
          break;
        default:
          console.warn('unknown body type: ' + descriptor.type + ', defaulting to dynamic');
          body.setCollisionFlags(0);
          break;
        case 'dynamic':
          body.setCollisionFlags(0);
          break;
        }
      }
    },

    RigidBody_setWorldTransform: function(descriptor) {
      var body = this.bodies[descriptor.bodyId],
          position,
          rotation;
      
      if (body) {
        this.tmpTrans[0].setIdentity();
        body.getMotionState().getWorldTransform(this.tmpTrans[0]);
        position = this.tmpTrans[0].getOrigin();
        rotation = this.tmpTrans[0].getRotation();

        if (descriptor.position) {
          position.setX(descriptor.position.x);
          position.setY(descriptor.position.y);
          position.setZ(descriptor.position.z);
        }

        if (descriptor.rotation) {
          rotation.setX(descriptor.rotation.x);
          rotation.setY(descriptor.rotation.y);
          rotation.setZ(descriptor.rotation.z);
          rotation.setW(descriptor.rotation.w);
        }

        if (body.isKinematicObject()) {
          body.getMotionState().setWorldTransform(this.tmpTrans[0]);
        } else {
          body.setWorldTransform(this.tmpTrans[0]);
        }
      }
    },

    RigidBody_clearForces: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        body.clearForces();
        body.activate();
      }
    },

    RigidBody_applyForce: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyForce(this.tmpVec[0], this.tmpVec[1]);
        body.activate();
      } 
    },

    RigidBody_applyCentralForce: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralForce(this.tmpVec[0]);
        body.activate();
      } 
    },

    RigidBody_applyImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.impulse.x);
        this.tmpVec[0].setY(descriptor.impulse.y);
        this.tmpVec[0].setZ(descriptor.impulse.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyImpulse(this.tmpVec[0], this.tmpVec[1]);
        body.activate();
      } 
    },

    RigidBody_applyCentralImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralImpulse(this.tmpVec[0]);
        body.activate();
      } 
    },

    RigidBody_applyTorque: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.torque.x);
        this.tmpVec[0].setY(descriptor.torque.y);
        this.tmpVec[0].setZ(descriptor.torque.z);
        
        body.applyTorque(this.tmpVec[0]);
        body.activate();
      }
    },

    RigidBody_setRestitution: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setRestitution(descriptor.restitution);
      }
    },

    RigidBody_setFriction: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setFriction(descriptor.friction);
      }
    },

    RigidBody_setDamping: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setDamping(descriptor.linearDamping, descriptor.angularDamping);
      }
    },

    RigidBody_setLinearFactor: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.linearFactor.x); 
        this.tmpVec[0].setY(descriptor.linearFactor.y); 
        this.tmpVec[0].setZ(descriptor.linearFactor.z); 
        body.setLinearFactor(this.tmpVec[0]);
      }
    },

    RigidBody_setAngularFactor: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.angularFactor.x); 
        this.tmpVec[0].setY(descriptor.angularFactor.y); 
        this.tmpVec[0].setZ(descriptor.angularFactor.z); 
        body.setAngularFactor(this.tmpVec[0]);
      }
    },

    RigidBody_setLinearVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.linearVelocity.x); 
        this.tmpVec[0].setY(descriptor.linearVelocity.y); 
        this.tmpVec[0].setZ(descriptor.linearVelocity.z); 
        body.setLinearVelocity(this.tmpVec[0]);
      }
    },

    RigidBody_setAngularVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.angularVelocity.x); 
        this.tmpVec[0].setY(descriptor.angularVelocity.y); 
        this.tmpVec[0].setZ(descriptor.angularVelocity.z); 
        body.setAngularVelocity(this.tmpVec[0]);
      }
    },

    Constraint_destroy: function(id) {
      var constraint = this.constraints[id];

      if (constraint) {
        this.dynamicsWorld.removeConstraint(constraint);
        Ammo.destroy(constraint);
        this.constraints[id] = undefined;
        this.trigger('Constraint_destroy', id);
      }
    },

    RigidBody_destroy: function(id) {
      var body = this.bodies[id];

      if (body) {
        this.dynamicsWorld.removeRigidBody(body);
        Ammo.destroy(body);
        this.bodies[id] = undefined;
        this.trigger('RigidBody_destroy', id);
      }
    },

    Vehicle_destroy: function(id) {
      var vehicle = this.vehicles[id];

      if (vehicle) {
        this.dynamicsWorld.removeVehicle(vehicle);
        Ammo.destroy(vehicle);
        this.vehicles[id] = undefined;
        this.trigger('Vehicle_destroy', id);
      }
    },

    GhostObject_destroy: function(id) {
      var ghost = this.ghosts[id];

      if (ghost) {
        this.dynamicsWorld.removeCollisionObject(ghost);
        Ammo.destroy(ghost);
        this.ghosts[id] = undefined;
        this.trigger('GhostObject_destroy', id);
      }
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
