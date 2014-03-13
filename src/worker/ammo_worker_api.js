define([ 'underscore' ], function(_) {
  "use strict";

  var MAX_TRANSFORMS = 2000;

  var CollisionFlags = {
    CF_STATIC_OBJECT: 1,
    CF_KINEMATIC_OBJECT: 2,
    CF_NO_CONTACT_RESPONSE: 4,
    CF_CUSTOM_MATERIAL_CALLBACK: 8,
    CF_CHARACTER_OBJECT: 16,
    CF_DISABLE_VISUALIZE_OBJECT: 32,
    CF_DISABLE_SPU_COLLISION_PROCESSING: 64
  };

  var ActivationStates = {
    ACTIVE_TAG: 1,
    ISLAND_SLEEPING: 2,
    WANTS_DEACTIVATION: 3,
    DISABLE_DEACTIVATION: 4,
    DISABLE_SIMULATION: 5
  };

  var CollisionFilterGroups = {
    DefaultFilter: 1,
    StaticFilter: 2,
    KinematicFilter: 4,
    DebrisFilter: 8,
    SensorTrigger: 16,
    CharacterFilter: 32,
    AllFilter: -1 //all bits sets: DefaultFilter | StaticFilter | KinematicFilter | DebrisFilter | SensorTrigger
  };

  var tmpVec = [
    new Ammo.btVector3(),
    new Ammo.btVector3(),
    new Ammo.btVector3(),
    new Ammo.btVector3()
  ];

  var tmpQuaternion = [
    new Ammo.btQuaternion(),
    new Ammo.btQuaternion()
  ];

  var tmpTrans = [
    new Ammo.btTransform(),
    new Ammo.btTransform()
  ];


  function AmmoObject(id, ammoData) {
    this.type = "unknown";
    this.id = id;
    this.ammoData = ammoData;
    this.offset = this.id * 7;
  }

  AmmoObject.prototype = {};

  /*
  AmmoObject.prototype.update = function(buffer) {
  };
  */

  function Vehicle(id, ammoData) {
    this.type = 'btRaycastVehicle';
    this.id = id;
    this.ammoData = ammoData;
    this.offset = this.id * 7;
  }

  Vehicle.prototype = new AmmoObject();

  function Wheel(id, ammoData) {
    this.type = 'btWheelInfo';
    this.id = id;
    this.ammoData = ammoData;
    this.offset = this.id * 7;
  }

  Wheel.prototype = new AmmoObject();

  Wheel.prototype.update = function(data) {
    tmpTrans[0] = this.ammoData.get_m_worldTransform();

    data[this.offset + 0] = tmpTrans[0].getOrigin().x();
    data[this.offset + 1] = tmpTrans[0].getOrigin().y();
    data[this.offset + 2] = tmpTrans[0].getOrigin().z();
    data[this.offset + 3] = tmpTrans[0].getRotation().x();
    data[this.offset + 4] = tmpTrans[0].getRotation().y();
    data[this.offset + 5] = tmpTrans[0].getRotation().z();
    data[this.offset + 6] = tmpTrans[0].getRotation().w();
  };

  function CollisionObject(id, ammoData) {
    this.type = 'btCollisionObject';
    this.id = id;
    this.ammoData = ammoData;
  }

  CollisionObject.prototype = new AmmoObject();

  function RigidBody(id, ammoData) {
    this.type = 'btRigidBody';
    this.id = id;
    this.ammoData = ammoData;
    this.offset = this.id * 7;
  }

  RigidBody.prototype = new CollisionObject();

  RigidBody.prototype.update = function(data) {
    tmpTrans[0].setIdentity();

    this.ammoData.getMotionState().getWorldTransform(tmpTrans[0]);

    data[this.offset + 0] = tmpTrans[0].getOrigin().x();
    data[this.offset + 1] = tmpTrans[0].getOrigin().y();
    data[this.offset + 2] = tmpTrans[0].getOrigin().z();
    data[this.offset + 3] = tmpTrans[0].getRotation().x();
    data[this.offset + 4] = tmpTrans[0].getRotation().y();
    data[this.offset + 5] = tmpTrans[0].getRotation().z();
    data[this.offset + 6] = tmpTrans[0].getRotation().w();
  };

  function KinematicCharacterController(id, ammoData) {
    this.type = 'btKinematicCharacterController';
    this.id = id;
    this.ammoData = ammoData;
  }

  KinematicCharacterController.prototype = new AmmoObject();

  KinematicCharacterController.prototype.update = function(data) {
    var trans = this.ammoData.getGhostObject().getWorldTransform();
    data[this.offset + 0] = trans.getOrigin().x();
    data[this.offset + 1] = trans.getOrigin().y();
    data[this.offset + 2] = trans.getOrigin().z();
    data[this.offset + 3] = trans.getRotation().x();
    data[this.offset + 4] = trans.getRotation().y();
    data[this.offset + 5] = trans.getRotation().z();
    data[this.offset + 6] = trans.getRotation().w();
  };


  self.console = self.console || {};

  function makeWorkerConsole(context){
    function makeConsole(method) {
      return function() {
        var len = arguments.length;
        var out = [];
        var i = 0;
        while (i < len) {
          out.push(arguments[i]);
          i++;
        }
        context.postMessage({ command: 'console', arguments: [method, out] });
      };
    }
    ['log', 'debug', 'error', 'info', 'warn', 'time', 'timeEnd'].forEach(function(v) {
      console[v] = makeConsole(v);
    });

  }

  makeWorkerConsole(self);

  self.addEventListener('message', function(message) {
    if (!_.isFunction(api[message.data.method])) {
      return console.error('Unknown method: ' + message.data.method);
    }

    if (message.data.method === 'swap') {
      api.swap(message.data.data);
    } else {
      api[message.data.method].call(api, message.data.descriptor, function(descriptor) {
        self.postMessage({ command: 'response', reqId: message.data.reqId, descriptor: descriptor });
      });
    }
  });

  function AmmoWorkerAPI(opts) {
    _.bindAll(this);

    for (var i in opts) {
      if (opts.hasOwnProperty(i)) {
        this[i] = opts[i];
      }
    }
  }

  AmmoWorkerAPI.prototype = {
    init: function() {
      var bufferSize = (7 * MAX_TRANSFORMS * 8);

      this.buffers = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize)
      ];

      this.ids = _.range(1, MAX_TRANSFORMS + 1);

      this.objects = new Array(MAX_TRANSFORMS);
      this.objectsByRef = {};

      this.ghostCollisions = {};
      this.collisions = {};

      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);

      this.overlappingPairCache = new Ammo.btDbvtBroadphase();

      /*
      tmpVec[0].setX(-1000);
      tmpVec[0].setY(-1000);
      tmpVec[0].setZ(-1000);
      tmpVec[1].setX(1000);
      tmpVec[1].setY(1000);
      tmpVec[1].setZ(1000);
      this.overlappingPairCache = new Ammo.btAxisSweep3(tmpVec[0], tmpVec[1]);
      */

      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
          this.overlappingPairCache, this.solver, this.collisionConfiguration);

      this.ghostPairCallback = new Ammo.btGhostPairCallback();
      this.dynamicsWorld.getPairCache().setInternalGhostPairCallback(this.ghostPairCallback);

      this.dynamicsWorld.getDispatchInfo().set_m_allowedCcdPenetration(0.0001);

      self.postMessage({ command: 'event', arguments: [ 'ready' ] });
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
        var /*vehicle, */update, i, /*j, pos,*/ now = Date.now(),
            delta = (now - last) / 1000;

        that.dynamicsWorld.stepSimulation(delta/*that.step*/, that.iterations, that.step);

        if (that.buffers.length > 0) {
          update = new Float64Array(that.buffers.pop());
        }

        if (update && update.buffer instanceof ArrayBuffer) {
          for (i = 0; i < MAX_TRANSFORMS; i++) {
            if (that.objects[i]) {
              that.objects[i].update(update);
            }
          }
          /*
          for (i = 0; i < that.bodies.length; i++) {
            if (that.bodies[i]) {
              tmpTrans[0].setIdentity();
              that.bodies[i].getMotionState().getWorldTransform(tmpTrans[0]);
              pos = that.OFFSET_RIGID_BODY + (i * 7);

              update[pos + 0] = tmpTrans[0].getOrigin().x();
              update[pos + 1] = tmpTrans[0].getOrigin().y();
              update[pos + 2] = tmpTrans[0].getOrigin().z();
              update[pos + 3] = tmpTrans[0].getRotation().x();
              update[pos + 4] = tmpTrans[0].getRotation().y();
              update[pos + 5] = tmpTrans[0].getRotation().z();
              update[pos + 6] = tmpTrans[0].getRotation().w();
            }
          }
          */

          /*
          for (i = 0; i < that.vehicles.length; i++) {
            if (that.vehicles[i]) {
              vehicle = that.vehicles[i];

              for ( j = 0; j < vehicle.getNumWheels() + 1; j++ ) {
                tmpTrans[0] = vehicle.getWheelInfo(j).get_m_worldTransform();
                pos = that.OFFSET_VEHICLE + (i * that.maxWheelsPerVehicle * 7) + (j * 7);

                update[pos + 0] = tmpTrans[0].getOrigin().x();
                update[pos + 1] = tmpTrans[0].getOrigin().y();
                update[pos + 2] = tmpTrans[0].getOrigin().z();
                update[pos + 3] = tmpTrans[0].getRotation().x();
                update[pos + 4] = tmpTrans[0].getRotation().y();
                update[pos + 5] = tmpTrans[0].getRotation().z();
                update[pos + 6] = tmpTrans[0].getRotation().w();
              }
            }
          }
          */

          /*
          for (i = 0; i < that.characterControllers.length; i++) {
            if (that.characterControllers[i]) {
              var trans = that.characterControllers[i].getGhostObject().getWorldTransform();
              pos = that.OFFSET_KINEMATIC_CHARACTER + (i * 7);

              update[pos + 0] = trans.getOrigin().x();
              update[pos + 1] = trans.getOrigin().y();
              update[pos + 2] = trans.getOrigin().z();
              update[pos + 3] = trans.getRotation().x();
              update[pos + 4] = trans.getRotation().y();
              update[pos + 5] = trans.getRotation().z();
              update[pos + 6] = trans.getRotation().w();
            }
          }
          */

          /*
          (function() {
            var dispatcher = that.dynamicsWorld.getDispatcher(),
                nManifolds = dispatcher.getNumManifolds(),
                manifold,
                nContacts,
                point,
                key1,
                type1,
                key2,
                type2,
                body1,
                body2,
                l,
                h;

            var previous = that.collisions,
                current = {};

            for (var i = 0; i < nManifolds; i++) {
              manifold = dispatcher.getManifoldByIndexInternal(i);

              nContacts = manifold.getNumContacts();

              if (nContacts > 0) {
                for (var j = 0; j < nContacts; j++) {
                  point = manifold.getContactPoint(j);
                  body1 = Ammo.wrapPointer(manifold.getBody0(), Ammo.btCollisionObject);
                  body2 = Ammo.wrapPointer(manifold.getBody1(), Ammo.btCollisionObject);

                  if (body1.userData && body2.userData) {
                    key1 = body1.userData.id;
                    key2 = body2.userData.id;
                    type1 = body1.userData.type;
                    type2 = body2.userData.type;
                    l = Math.min(key1, key2);
                    h = Math.max(key1, key2);

                    current[l] = current[l] || {};
                    current[l][h] = true;
                    current[h] = current[h] || {};
                    current[h][l] = true;

                    if (current[l][h] && !previous[l] || !previous[l][h]) {
                      self.postMessage({ command: 'event', arguments: [
                          'begin_contact', {
                            objectA: { type: type1, id: key1 },
                            objectB: { type: type2, id: key2 }
                          }
                        ]
                      });
                    }
                  }
                }
              }
            }

            _.each(previous, function(source, sourceId) {
              _.each(source, function(other, otherId) {
                if (!current[sourceId] || !current[sourceId][otherId]) {
                  self.postMessage({ command: 'event', arguments: [
                      'end_contact', {
                        objectA: { type: 'btRigidBody', id: sourceId },
                        objectB: { type: 'btRigidBody', id: otherId }
                      }
                    ]
                  });
                }
              });
            });

            that.collisions = current;
          })();
          */

          /*
          that.ghosts.forEach(function(ghost, id) {
            if (ghost) {
              var trans = ghost.getWorldTransform();
              pos = that.OFFSET_GHOST_OBJECT + (id * 7);

              update[pos + 0] = trans.getOrigin().x();
              update[pos + 1] = trans.getOrigin().y();
              update[pos + 2] = trans.getOrigin().z();
              update[pos + 3] = trans.getRotation().x();
              update[pos + 4] = trans.getRotation().y();
              update[pos + 5] = trans.getRotation().z();
              update[pos + 6] = trans.getRotation().w();

              that.ghostCollisions[id] = that.ghostCollisions[id] || {};

              var i,
                  key,
                  type,
                  num = ghost.getNumOverlappingObjects(),
                  newCollisions = {},
                  body;

              if (num > 0) {
                for (i = 0; i < num; i++) {
                  body = Ammo.castObject(ghost.getOverlappingObject(i), Ammo.btCollisionObject);
                  if (body.userData) {
                    key = body.userData.id;

                    newCollisions[key] = body.userData.type;

                    if (!that.ghostCollisions[id][key]) {
                      self.postMessage({ command: 'event', arguments: [ 'ghost_enter', {
                        objectA: { type: 'btGhostObject', id: id },
                        objectB: { type: body.userData.type, id: body.userData.id }
                      } ]});
                    }
                  }
                }
              }

              for (key in that.ghostCollisions[id]) {
                if (!newCollisions[key]) {
                  type = that.ghostCollisions[id][key];
                  self.postMessage({ command: 'event', arguments: [ 'ghost_exit', {
                    objectA: { type: 'btGhostObject', id: id },
                    objectB: { type: type, id: key }
                  } ]});
                  delete that.ghostCollisions[id][key];
                }
              }
              that.ghostCollisions[id] = newCollisions;
            }
          }.bind(this));
          */

          self.postMessage({ command: 'update', data: update.buffer }, [update.buffer]);
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

    setStep: function(descriptor) {
      this.step = descriptor.step;
    },

    setIterations: function(descriptor) {
      this.iterations = descriptor.iterations;
    },

    setGravity: function(descriptor) {
      tmpVec[0].setX(descriptor.gravity.x);
      tmpVec[0].setY(descriptor.gravity.y);
      tmpVec[0].setZ(descriptor.gravity.z);
      this.dynamicsWorld.setGravity(tmpVec[0]);
    },

    _createCompoundShape: function(shape) {
      var compound = new Ammo.btCompoundShape(),
          localTransform = tmpTrans[0],
          child,
          childShape;

      if (shape.children && shape.children.length) {
        for (var idx in shape.children) {
          if (shape.children.hasOwnProperty(idx)) {
            child = shape.children[idx];
            childShape = this._createShape(child);
            localTransform.setIdentity();
            tmpVec[0].setX(child.localTransform.position.x);
            tmpVec[0].setY(child.localTransform.position.y);
            tmpVec[0].setZ(child.localTransform.position.z);
            localTransform.setOrigin(tmpVec[0]);
            tmpQuaternion[0].setX(child.localTransform.rotation.x);
            tmpQuaternion[0].setY(child.localTransform.rotation.y);
            tmpQuaternion[0].setZ(child.localTransform.rotation.z);
            tmpQuaternion[0].setW(child.localTransform.rotation.w);
            localTransform.setRotation(tmpQuaternion[0]);
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
        tmpVec[0].setX(shape.vertices[i*3+0]);
        tmpVec[0].setY(shape.vertices[i*3+1]);
        tmpVec[0].setZ(shape.vertices[i*3+2]);
        colShape.addPoint(tmpVec[0]);
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
        tmpVec[0].setX(shape.triangles[i * 9 + 0]);
        tmpVec[0].setY(shape.triangles[i * 9 + 1]);
        tmpVec[0].setZ(shape.triangles[i * 9 + 2]);

        tmpVec[1].setX(shape.triangles[i * 9 + 3]);
        tmpVec[1].setY(shape.triangles[i * 9 + 4]);
        tmpVec[1].setZ(shape.triangles[i * 9 + 5]);

        tmpVec[2].setX(shape.triangles[i * 9 + 6]);
        tmpVec[2].setY(shape.triangles[i * 9 + 7]);
        tmpVec[2].setZ(shape.triangles[i * 9 + 8]);

        mesh.addTriangle(tmpVec[0], tmpVec[1], tmpVec[2], false);
      }

      return new Ammo[className](mesh, true, true);
    },

    _createShape: function(shape) {
      var colShape;
      switch(shape.shape) {
      case 'box':
        tmpVec[0].setX(shape.halfExtents.x);
        tmpVec[0].setY(shape.halfExtents.y);
        tmpVec[0].setZ(shape.halfExtents.z);
        colShape = new Ammo.btBoxShape(tmpVec[0]);
        break;
      case 'sphere':
        colShape = new Ammo.btSphereShape(shape.radius);
        break;
      case 'staticplane':
        tmpVec[0].setX(shape.normal.x);
        tmpVec[0].setY(shape.normal.y);
        tmpVec[0].setZ(shape.normal.z);
        colShape = new Ammo.btStaticPlaneShape(tmpVec[0], shape.distance);
        break;
      case 'cylinder':
        tmpVec[0].setX(shape.width);
        tmpVec[0].setY(shape.height);
        tmpVec[0].setZ(shape.depth);
        colShape = new Ammo.btCylinderShape(tmpVec[0]);
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

              if (clientObject.userData.id) {
                _this.bodies.push(clientObject.userData.id);
              }

              return true;
            }
          }]);
        })();
      }

      tmpVec[0].setX(descriptor.min.x);
      tmpVec[0].setY(descriptor.min.y);
      tmpVec[0].setZ(descriptor.min.z);

      tmpVec[1].setX(descriptor.max.x);
      tmpVec[1].setY(descriptor.max.y);
      tmpVec[1].setZ(descriptor.max.z);

      this.aabbCallback.bodies = [];
      this.dynamicsWorld
        .getBroadphase()
        .aabbTest(tmpVec[0], tmpVec[1],
          this.aabbCallback);

      fn(this.aabbCallback.bodies);
    },

    Vehicle_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused transforms left!');
      }

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

      body.setActivationState(ActivationStates.DISABLE_DEACTIVATION);
      vehicle.setCoordinateSystem(0, 1, 2);

      this.dynamicsWorld.addVehicle(vehicle);

      var id = this.ids.pop();

      vehicle.userData = {
        type: 'btRaycastVehicle',
        id: id
      };

      this.vehicles[id] = vehicle;

      if (typeof fn === 'function') {
        fn(id);
      }
    },

    Vehicle_addWheel: function(descriptor, fn) {
      var vehicle = this.vehicles[descriptor.vehicleId];

      if (vehicle !== undefined) {
        var tuning = vehicle.tuning,
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
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        tmpVec[0].setX(descriptor.pivotA.x);
        tmpVec[0].setY(descriptor.pivotA.y);
        tmpVec[0].setZ(descriptor.pivotA.z);

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          tmpVec[1].setX(descriptor.pivotB.x);
          tmpVec[1].setY(descriptor.pivotB.y);
          tmpVec[1].setZ(descriptor.pivotB.z);
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB, tmpVec[0], tmpVec[1]);
        } else {
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB);
        }

        id = this.ids.pop();

        this.constraints[id] = constraint;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    SliderConstraint_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        var transformA = new Ammo.btTransform();

        tmpVec[0].setX(descriptor.frameInA.position.x);
        tmpVec[0].setY(descriptor.frameInA.position.y);
        tmpVec[0].setZ(descriptor.frameInA.position.z);

        tmpQuaternion[0].setX(descriptor.frameInA.rotation.x);
        tmpQuaternion[0].setY(descriptor.frameInA.rotation.y);
        tmpQuaternion[0].setZ(descriptor.frameInA.rotation.z);
        tmpQuaternion[0].setW(descriptor.frameInA.rotation.w);

        transformA.setOrigin(tmpVec[0]);
        transformA.setRotation(tmpQuaternion[0]);

        if (rigidBodyB) {
          var transformB = new Ammo.btTransform();

          tmpVec[1].setX(descriptor.frameInB.position.x);
          tmpVec[1].setY(descriptor.frameInB.position.y);
          tmpVec[1].setZ(descriptor.frameInB.position.z);

          tmpQuaternion[1].setX(descriptor.frameInB.rotation.x);
          tmpQuaternion[1].setY(descriptor.frameInB.rotation.y);
          tmpQuaternion[1].setZ(descriptor.frameInB.rotation.z);
          tmpQuaternion[1].setW(descriptor.frameInB.rotation.w);

          transformB.setOrigin(tmpVec[1]);
          transformB.setRotation(tmpQuaternion[1]);

          constraint = new Ammo.btSliderConstraint(rigidBodyA, rigidBodyB,
            transformA, transformB);
        } else {
          constraint = new Ammo.btSliderConstraint(rigidBodyA, transformA);
        }

        id = this.ids.pop();
        this.constraints[id] = constraint;

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

    Generic6DofConstraint_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        var transformA = new Ammo.btTransform();

        tmpVec[0].setX(descriptor.rbAFrame.position.x);
        tmpVec[0].setY(descriptor.rbAFrame.position.y);
        tmpVec[0].setZ(descriptor.rbAFrame.position.z);

        tmpQuaternion[0].setX(descriptor.rbAFrame.rotation.x);
        tmpQuaternion[0].setY(descriptor.rbAFrame.rotation.y);
        tmpQuaternion[0].setZ(descriptor.rbAFrame.rotation.z);
        tmpQuaternion[0].setW(descriptor.rbAFrame.rotation.w);

        transformA.setOrigin(tmpVec[0]);
        transformA.setRotation(tmpQuaternion[0]);

        if (rigidBodyB) {
          var transformB = new Ammo.btTransform();

          tmpVec[1].setX(descriptor.rbBFrame.position.x);
          tmpVec[1].setY(descriptor.rbBFrame.position.y);
          tmpVec[1].setZ(descriptor.rbBFrame.position.z);

          tmpQuaternion[1].setX(descriptor.rbBFrame.rotation.x);
          tmpQuaternion[1].setY(descriptor.rbBFrame.rotation.y);
          tmpQuaternion[1].setZ(descriptor.rbBFrame.rotation.z);
          tmpQuaternion[1].setW(descriptor.rbBFrame.rotation.w);

          transformB.setOrigin(tmpVec[1]);
          transformB.setRotation(tmpQuaternion[1]);

          constraint = new Ammo.btGeneric6DofConstraint(rigidBodyA, rigidBodyB, transformA, transformB, !!descriptor.useLinearReference);
        } else {
          constraint = new Ammo.btGeneric6DofConstraint(rigidBodyA, transformA, !!descriptor.useLinearReference);
        }

        id = this.ids.pop();
        this.constraints[id] = constraint;

        this.dynamicsWorld.addConstraint(constraint);
        //constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },


    ConeTwistConstraint_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        var transformA = new Ammo.btTransform();

        tmpVec[0].setX(descriptor.rbAFrame.position.x);
        tmpVec[0].setY(descriptor.rbAFrame.position.y);
        tmpVec[0].setZ(descriptor.rbAFrame.position.z);

        tmpQuaternion[0].setX(descriptor.rbAFrame.rotation.x);
        tmpQuaternion[0].setY(descriptor.rbAFrame.rotation.y);
        tmpQuaternion[0].setZ(descriptor.rbAFrame.rotation.z);
        tmpQuaternion[0].setW(descriptor.rbAFrame.rotation.w);

        transformA.setOrigin(tmpVec[0]);
        transformA.setRotation(tmpQuaternion[0]);

        if (rigidBodyB) {
          var transformB = new Ammo.btTransform();

          tmpVec[1].setX(descriptor.rbBFrame.position.x);
          tmpVec[1].setY(descriptor.rbBFrame.position.y);
          tmpVec[1].setZ(descriptor.rbBFrame.position.z);

          tmpQuaternion[1].setX(descriptor.rbBFrame.rotation.x);
          tmpQuaternion[1].setY(descriptor.rbBFrame.rotation.y);
          tmpQuaternion[1].setZ(descriptor.rbBFrame.rotation.z);
          tmpQuaternion[1].setW(descriptor.rbBFrame.rotation.w);

          transformB.setOrigin(tmpVec[1]);
          transformB.setRotation(tmpQuaternion[1]);

          constraint = new Ammo.btConeTwistConstraint(rigidBodyA, rigidBodyB, transformA, transformB);
        } else {
          constraint = new Ammo.btConeTwistConstraint(rigidBodyA, transformA);
        }

        id = this.ids.pop();
        this.constraints[id] = constraint;

        this.dynamicsWorld.addConstraint(constraint);
        //constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    ConeTwistConstraint_setAngularOnly: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setAngularOnly(descriptor.angularOnly);
      }
    },

    ConeTwistConstraint_setDamping: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setDamping(descriptor.damping);
      }
    },

    ConeTwistConstraint_enableMotor: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.enableMotor(descriptor.isEnabled);
      }
    },

    ConeTwistConstraint_setMaxMotorImpulse: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setMaxMotorImpulse(descriptor.maxMotorImpulse);
      }
    },

    ConeTwistConstraint_setMaxMotorImpulseNormalized: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setMaxMotorImpulseNormalized(descriptor.maxMotorImpulse);
      }
    },

    ConeTwistConstraint_setMotorTarget: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setMotorTarget(descriptor.motorTarget);
      }
    },

    ConeTwistConstraint_setMotorTargetInConstraintSpace: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setMotorTargetInConstraintSpace(descriptor.motorTarget);
      }
    },

    ConeTwistConstraint_setLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLimit(descriptor.swingSpan1, descriptor.swingSpan2,
            descriptor.twistSpan, descriptor.softness, descriptor.biasFactor,
            descriptor.relaxationFactor);
      }
    },

    HingeConstraint_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        tmpVec[0].setX(descriptor.pivotA.x);
        tmpVec[0].setY(descriptor.pivotA.y);
        tmpVec[0].setZ(descriptor.pivotA.z);
        tmpVec[1].setX(descriptor.axisA.x);
        tmpVec[1].setX(descriptor.axisA.y);
        tmpVec[1].setX(descriptor.axisA.z);

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          tmpVec[2].setX(descriptor.pivotB.x);
          tmpVec[2].setY(descriptor.pivotB.y);
          tmpVec[2].setZ(descriptor.pivotB.z);
          tmpVec[3].setX(descriptor.axisB.x);
          tmpVec[3].setY(descriptor.axisB.y);
          tmpVec[3].setZ(descriptor.axisB.z);
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              tmpVec[0], tmpVec[2], tmpVec[1], tmpVec[3]);
        } else {
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              tmpVec[0], tmpVec[1]);
        }

        id = this.ids.pop();
        this.constraints[id] = constraint;

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
      tmpVec[0].setX(descriptor.rayFromWorld.x);
      tmpVec[0].setY(descriptor.rayFromWorld.y);
      tmpVec[0].setZ(descriptor.rayFromWorld.z);
      tmpVec[1].setX(descriptor.rayToWorld.x);
      tmpVec[1].setY(descriptor.rayToWorld.y);
      tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.AllHitsRayResultCallback(tmpVec[0], tmpVec[1]);

      this.dynamicsWorld.rayTest(tmpVec[0], tmpVec[1], callback);

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
      tmpVec[0].setX(descriptor.rayFromWorld.x);
      tmpVec[0].setY(descriptor.rayFromWorld.y);
      tmpVec[0].setZ(descriptor.rayFromWorld.z);
      tmpVec[1].setX(descriptor.rayToWorld.x);
      tmpVec[1].setY(descriptor.rayToWorld.y);
      tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.ClosestRayResultCallback(tmpVec[0], tmpVec[1]);

      this.dynamicsWorld.rayTest(tmpVec[0], tmpVec[1], callback);

      if (callback.hasHit()) {
        var body = Ammo.castObject(callback.get_m_collisionObject(), Ammo.btCollisionObject);

        if (body.userData.id) {
          if (typeof fn === 'function') {
            fn({
              type: 'btRigidBody',
              bodyId: body.userData.id,
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
      var body = this.objects[descriptor.bodyId];

      if (body && body.ammoData) {
        this.dynamicsWorld.addRigidBody(body.ammoData, descriptor.group, descriptor.mask);
      }
    },

    DynamicsWorld_addGhostObject: function(descriptor) {
      var ghost = this.ghosts[descriptor.ghostId];

      if (ghost) {
        this.dynamicsWorld.addCollisionObject(ghost, descriptor.group, descriptor.mask);
      }
    },

    DynamicsWorld_addCollisionObject: function(descriptor) {
      console.log('adding collisionObject: ' + JSON.stringify(descriptor));
      var collisionObject = this.collisionObjects[descriptor.collisionObjectId];

      if (collisionObject) {
        console.log('before');
        this.dynamicsWorld.addCollisionObject(collisionObject, descriptor.group, descriptor.mask);
        console.log('after');
      }
    },

    GhostObject_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids');
      }
      var colShape = this._createShape(descriptor.shape),
          origin = tmpVec[0],
          rotation = tmpQuaternion[0],
          ghostObject;

      if (!colShape) {
        return console.error('Invalid collision shape!');
      }

      tmpTrans[0].setIdentity();

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      tmpTrans[0].setOrigin(origin);
      tmpTrans[0].setRotation(rotation);

      ghostObject = new Ammo.btPairCachingGhostObject();
      ghostObject.setWorldTransform(tmpTrans[0]);

      ghostObject.setCollisionShape(colShape);
      ghostObject.setCollisionFlags(CollisionFlags.CF_NO_CONTACT_RESPONSE); // no collision response

      var id = this.ids.pop();

      this.ghosts[id] = ghostObject;

      var o = Ammo.castObject(ghostObject, Ammo.btCollisionObject);

      ghostObject.userData = o.userData = {
        type: 'btGhostObject',
        id: id
      };

      if (typeof fn === 'function') {
        fn(id);
      }
    },

    KinematicCharacterController_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var colShape,
          startTransform = tmpTrans[0],
          origin = tmpVec[1],
          rotation = tmpQuaternion[0],
          ghost,
          controller;

      startTransform.setIdentity();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
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

      ghost = new Ammo.btPairCachingGhostObject();
      ghost.setWorldTransform(startTransform);

      ghost.setCollisionShape(colShape);
      ghost.setCollisionFlags(CollisionFlags.CF_CHARACTER_OBJECT);

      controller = new Ammo.btKinematicCharacterController (ghost, colShape, descriptor.stepHeight);

      this.dynamicsWorld.addCollisionObject(ghost, CollisionFilterGroups.CharacterFilter,
        CollisionFilterGroups.StaticFilter | CollisionFilterGroups.DefaultFilter);

      this.dynamicsWorld.addAction(controller);

      var id = this.ids.pop();
      this.characterControllers[id] = controller;

      var o = Ammo.castObject(ghost, Ammo.btCollisionObject);

      controller.userData = o.userData = {
        type: 'btKinematicCharacterController',
        id: id
      };

      if (typeof fn === 'function') {
        fn(id);
      }
    },

    KinematicCharacterController_setWalkDirection: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        tmpVec[0].setX(descriptor.direction.x);
        tmpVec[0].setY(descriptor.direction.y);
        tmpVec[0].setZ(descriptor.direction.z);

        controller.setWalkDirection(tmpVec[0]);
      }
    },

    KinematicCharacterController_jump: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.jump();
      }
    },

    KinematicCharacterController_setJumpSpeed: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setJumpSpeed(descriptor.jumpSpeed);
      }
    },

    KinematicCharacterController_setFallSpeed: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setFallSpeed(descriptor.fallSpeed);
      }
    },

    KinematicCharacterController_setMaxJumpHeight: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setMaxJumpHeight(descriptor.maxJumpHeight);
      }
    },

    KinematicCharacterController_setGravity: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setGravity(descriptor.gravity);
      }
    },

    KinematicCharacterController_setUpAxis: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setUpAxis(descriptor.upAxis);
      }
    },

    KinematicCharacterController_setVelocityForTimeInterval: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        tmpVec[0].setX(descriptor.velocity.x);
        tmpVec[0].setY(descriptor.velocity.y);
        tmpVec[0].setZ(descriptor.velocity.z);

        controller.setVelocityForTimeInterval(tmpVec[0], descriptor.interval);
      }
    },

    KinematicCharacterController_setUseGhostSweepTest: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setUseGhostSweepTest(descriptor.useGhostSweepTest);
      }
    },

    KinematicCharacterController_setMaxSlope: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setMaxSlope(descriptor.slopeRadians);
      }
    },

    KinematicCharacterController_warp: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        tmpVec[0].setX(descriptor.origin.x);
        tmpVec[0].setY(descriptor.origin.y);
        tmpVec[0].setZ(descriptor.origin.z);

        controller.warp(tmpVec[0]);
      }
    },

    RigidBody_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var colShape,
          startTransform = tmpTrans[0],
          isDynamic = (descriptor.mass !== 0),
          localInertia = tmpVec[0],
          origin = tmpVec[1],
          rotation = tmpQuaternion[0],
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

      var id = this.ids.pop();

      var obj = new RigidBody(id, body);

      this.objects[id] = obj;
      this.objectsByRef[body] = obj;

      var o = Ammo.castObject(body, Ammo.btCollisionObject);

      body.userData = o.userData = {
        type: 'btRigidBody',
        id: id
      };

      if (typeof fn === 'function') {
        fn(id);
      }
    },

    CollisionObject_create: function(descriptor, fn) {
      if (!this.ids.length) {
        return console.error('No unused ids!');
      }

      var colShape,
          startTransform = tmpTrans[0],
          origin = tmpVec[1],
          rotation = tmpQuaternion[0],
          body;

      startTransform.setIdentity();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
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

      body = new Ammo.btCollisionObject();

      body.setCollisionShape(colShape);

      var id = this.ids.pop();

      this.collisionObjects[id] = body;

      body.userData = {
        type: 'btCollisionObject',
        id: id
      };

      if (typeof fn === 'function') {
        fn(id);
      }
    },

    CollisionObject_setActivationState: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setActivationState(descriptor.activationState);
      }
    },

    RigidBody_setType: function(descriptor) {
      var body = this.objects[descriptor.bodyId];

      if (body && body.ammoData) {
        switch (descriptor.type) {
        case 'static':
          body.ammoData.setCollisionFlags(CollisionFlags.CF_STATIC_OBJECT);
          body.ammoData.setActivationState(ActivationStates.DISABLE_SIMULATION);
          break;
        case 'kinematic':
          body.ammoData.setCollisionFlags(CollisionFlags.CF_KINEMATIC_OBJECT);
          body.ammoData.setActivationState(ActivationStates.DISABLE_DEACTIVATION);
          break;
        default:
          console.warn('unknown body type: ' + descriptor.type + ', defaulting to dynamic');
          body.ammoData.setCollisionFlags(0);
          break;
        case 'dynamic':
          body.ammoData.setCollisionFlags(0);
          break;
        }
      }
    },

    RigidBody_setWorldTransform: function(descriptor) {
      var body = this.bodies[descriptor.bodyId],
          position,
          rotation;

      if (body) {
        tmpTrans[0].setIdentity();
        body.getMotionState().getWorldTransform(tmpTrans[0]);
        position = tmpTrans[0].getOrigin();
        rotation = tmpTrans[0].getRotation();

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
          body.getMotionState().setWorldTransform(tmpTrans[0]);
        } else {
          body.setWorldTransform(tmpTrans[0]);
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
        tmpVec[0].setX(descriptor.force.x);
        tmpVec[0].setY(descriptor.force.y);
        tmpVec[0].setZ(descriptor.force.z);
        tmpVec[1].setX(descriptor.relativePosition.x);
        tmpVec[1].setY(descriptor.relativePosition.y);
        tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyForce(tmpVec[0], tmpVec[1]);
        body.activate();
      }
    },

    RigidBody_applyCentralForce: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.force.x);
        tmpVec[0].setY(descriptor.force.y);
        tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralForce(tmpVec[0]);
        body.activate();
      }
    },

    RigidBody_applyImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.impulse.x);
        tmpVec[0].setY(descriptor.impulse.y);
        tmpVec[0].setZ(descriptor.impulse.z);
        tmpVec[1].setX(descriptor.relativePosition.x);
        tmpVec[1].setY(descriptor.relativePosition.y);
        tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyImpulse(tmpVec[0], tmpVec[1]);
        body.activate();
      }
    },

    RigidBody_applyCentralImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.force.x);
        tmpVec[0].setY(descriptor.force.y);
        tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralImpulse(tmpVec[0]);
        body.activate();
      }
    },

    RigidBody_applyTorque: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.torque.x);
        tmpVec[0].setY(descriptor.torque.y);
        tmpVec[0].setZ(descriptor.torque.z);

        body.applyTorque(tmpVec[0]);
        body.activate();
      }
    },

    RigidBody_setRestitution: function(descriptor) {
      var body = this.objects[descriptor.bodyId];

      if (body && body.ammoData) {
        body.ammoData.setRestitution(descriptor.restitution);
      }
    },

    RigidBody_setFriction: function(descriptor) {
      var body = this.objects[descriptor.bodyId];

      if (body && body.ammoData) {
        body.ammoData.setFriction(descriptor.friction);
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
        tmpVec[0].setX(descriptor.linearFactor.x);
        tmpVec[0].setY(descriptor.linearFactor.y);
        tmpVec[0].setZ(descriptor.linearFactor.z);
        body.setLinearFactor(tmpVec[0]);
      }
    },

    RigidBody_setAngularFactor: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.angularFactor.x);
        tmpVec[0].setY(descriptor.angularFactor.y);
        tmpVec[0].setZ(descriptor.angularFactor.z);
        body.setAngularFactor(tmpVec[0]);
      }
    },

    RigidBody_setLinearVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.linearVelocity.x);
        tmpVec[0].setY(descriptor.linearVelocity.y);
        tmpVec[0].setZ(descriptor.linearVelocity.z);
        body.setLinearVelocity(tmpVec[0]);
      }
    },

    RigidBody_setAngularVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        tmpVec[0].setX(descriptor.angularVelocity.x);
        tmpVec[0].setY(descriptor.angularVelocity.y);
        tmpVec[0].setZ(descriptor.angularVelocity.z);
        body.setAngularVelocity(tmpVec[0]);
      }
    },

    trigger: function() {
      self.postMessage({ command: 'event', arguments: Array.prototype.slice.call(arguments, 0) });
    },

    Constraint_destroy: function(descriptor) {
      var id = descriptor && descriptor.constraintId,
          constraint = this.constraints[id];

      if (constraint) {
        this.dynamicsWorld.removeConstraint(constraint);
        Ammo.destroy(constraint);
        this.constraints[id] = undefined;
        this.trigger('Constraint_destroy', id);
        this.ids.push(id);
      }
    },

    RigidBody_destroy: function(descriptor) {
      var id = descriptor && descriptor.bodyId,
          body = this.bodies[id];

      if (body) {
        this.dynamicsWorld.removeRigidBody(body);
        Ammo.destroy(body);
        this.bodies[id] = undefined;
        this.trigger('RigidBody_destroy', id);
        this.ids.push(id);
      }
    },

    Vehicle_destroy: function(descriptor) {
      var id = descriptor.vehicleId,
          vehicle = this.vehicles[id];

      if (vehicle) {
        this.dynamicsWorld.removeVehicle(vehicle);
        Ammo.destroy(vehicle);
        this.vehicles[id] = undefined;
        this.trigger('Vehicle_destroy', id);
        this.ids.push(id);
      }
    },

    GhostObject_destroy: function(descriptor) {
      var id = descriptor.ghostId,
          ghost = this.ghosts[id];

      if (ghost) {
        this.dynamicsWorld.removeCollisionObject(ghost);
        Ammo.destroy(ghost);
        this.ghosts[id] = undefined;
        this.trigger('GhostObject_destroy', id);
        this.ids.push(id);
      }
    },

    shutdown: function() {
      Ammo.destroy(this.collisionConfiguration);
      Ammo.destroy(this.dispatcher);
      Ammo.destroy(this.overlappingPairCache);
      Ammo.destroy(this.solver);
    }
  };

  var api = new AmmoWorkerAPI();
  api.init();
});
