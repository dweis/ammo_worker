/* global importScripts */
define([], function() {
  "use strict";

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
      var bufferSize = (this.maxBodies * 7 * 8) + (this.maxVehicles * this.maxWheelsPerVehicle * 7 * 8);

      importScripts('./js/ammo.js');
      //import Scripts('http://assets.verold.com/verold_api/lib/ammo.js');

      this.tmpVec = [
        new Ammo.btVector3(),
        new Ammo.btVector3(),
        new Ammo.btVector3()
      ];

      this.tmpQuaternion = [
        new Ammo.btQuaternion()
      ];

      this.tmpTrans = [
        new Ammo.btTransform()
      ];

      this.bodies = [];
      this.vehicles = [];
      this.contraints = [];

      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
      this.overlappingPairCache = new Ammo.btDbvtBroadphase();
      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
          this.overlappingPairCache, this.solver, this.collisionConfiguration);

      this.buffers = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize)
      ];

      this.fire('ready');
    },

    startSimulation: function() {
      var that = this, last = Date.now();

      this.simulationTimerId = setInterval(function() {
        var vehicle, update, i, j, pos, now = Date.now(),
            delta = (now - last) / 1000;

        last = now;

        that.dynamicsWorld.stepSimulation(delta/*that.step*/, that.iterations);

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

          that.fire('update', update.buffer, [update.buffer]);
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

      for (i = 0; i < shape.triangles.length/9; i += 3) {
        this.tmpVec[0].setX(shape.triangles[i * 9 + 0]);
        this.tmpVec[0].setY(shape.triangles[i * 9 + 1]);
        this.tmpVec[0].setZ(shape.triangles[i * 9 + 2]);

        this.tmpVec[1].setX(shape.triangles[i * 9 + 3]);
        this.tmpVec[1].setY(shape.triangles[i * 9 + 4]);
        this.tmpVec[1].setZ(shape.triangles[i * 9 + 5]);

        this.tmpVec[2].setX(shape.triangles[i * 9 + 6]);
        this.tmpVec[2].setY(shape.triangles[i * 9 + 7]);
        this.tmpVec[2].setZ(shape.triangles[i * 9 + 8]);

        mesh.addTriangle(this.tmpVec[0], this.tmpVec[1], this.tmpVec[2], true);
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

      body.setActivationState(4);
      vehicle.setCoordinateSystem(0, 1, 2);

      this.dynamicsWorld.addVehicle(vehicle);
      var idx = this.vehicles.push(vehicle) - 1;
      vehicle.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    Vehicle_destroy: function(id) {
      this.dynamicsWorld.removeVehicle(this.vehicles[id]);
      this.vehicles[id] = undefined;
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
            //console.log('setting ' + i + ' to ' + descriptor.properties[i]);
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

    Point2PointContraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB,
          contraint,
          id;

      if (rigidBodyA) {
        this.tmpVec[0].setX(descriptor.pivotA.x);
        this.tmpVec[0].setY(descriptor.pivotA.y);
        this.tmpVec[0].setZ(descriptor.pivotA.z); 

        if (descriptor.rigidBodyIdB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          this.tmpVec[1].setX(descriptor.pivotB.x);
          this.tmpVec[1].setY(descriptor.pivotB.y);
          this.tmpVec[1].setZ(descriptor.pivotB.z); 
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB, this.tmpVec[0], this.tmpVec[1]);
        } else {
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB);
        }

        id = this.contraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
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

      this.dynamicsWorld.addRigidBody(body);

      var idx = this.bodies.push(body) - 1;
      body.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    RigidBody_applyForce: function(descriptor, fn) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyForce(this.tmpVec[0], this.tmpVec[1]);
      } 

      if (typeof fn === 'function') {
        fn();
      }
    },

    RigidBody_applyImpulse: function(descriptor, fn) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.impulse.x);
        this.tmpVec[0].setY(descriptor.impulse.y);
        this.tmpVec[0].setZ(descriptor.impulse.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyImpulse(this.tmpVec[0], this.tmpVec[1]);
      } 

      if (typeof fn === 'function') {
        fn();
      }
    },

    RigidBody_applyTorque: function(descriptor, fn) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.torque.x);
        this.tmpVec[0].setY(descriptor.torque.y);
        this.tmpVec[0].setZ(descriptor.torque.z);
        
        body.applyTorque(this.tmpVec[0]);
      }

      if (typeof fn === 'function') {
        fn();
      }
    },

    RigidBody_setRestitution: function(descriptor, fn) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setRestitution(descriptor.restitution);
      }

      if (typeof fn === 'function') {
        fn();
      }
    },

    RigidBody_setFriction: function(descriptor, fn) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setFriction(descriptor.friction);
      }

      if (typeof fn === 'function') {
        fn();
      }
    },

    RigidBody_destroy: function(id) {
      this.dynamicsWorld.removeRigidBody(this.bodies[id]);
      Ammo.destroy(this.bodies[id]);
      this.bodies[id] = undefined;
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
