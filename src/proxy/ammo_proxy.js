define([ 'when', 'underscore', 'vendor/backbone.events', 'text!gen/ammo_worker_api.js', 'proxy/ammo_rigid_body', 'proxy/ammo_vehicle', 
         'proxy/ammo_point2point_constraint', 'proxy/ammo_hinge_constraint', 'proxy/ammo_slider_constraint',
         'proxy/ammo_ghost_object', 'proxy/ammo_kinematic_character_controller', 'proxy/three/three_adapter' ], 
      function(when, _, Events, AmmoWorkerAPI, AmmoRigidBody, AmmoVehicle, AmmoPoint2PointConstraint,
        AmmoHingeConstraint, AmmoSliderConstraint, AmmoGhostObject, 
        AmmoKinematicCharacterController, THREEAdapter) {
  function AmmoProxy(opts) {
    /*
    var context = this, i, apiMethods = [
      'on', 'fire', 'setStep', 'setIterations', 'setGravity', 'startSimulation',
      'stopSimulation', 'getStats'
    ];
    */

    this.reqId = 0;
    this.promises = {};

    this.createWorker();

    _.bindAll(this);

    this.worker.addEventListener('message', this.onCommand, false);

    opts = this.opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0};
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.maxBodies = opts.maxBodies || 1000;
    opts.maxVehicles = opts.maxVehicles || 32;
    opts.maxWheelsPerVehicle = opts.maxWheelsPerVehicle || 8;
    opts.maxKinematicCharacterControllers = opts.maxKinematicCharacterControllers || 16;
    opts.maxGhostObjects = opts.maxGhostObjects || 500;

    var bodies = this.bodies = [];
    var constraints = this.constraints = [];
    var vehicles = this.vehicles = [];
    var ghosts = this.ghosts = [];
    var kinematicCharacterControllers = this.kinematicCharacterControllers = [];

    this.adapter = new THREEAdapter(this);

    //this.worker = cw(new AmmoWorkerAPI(opts));

    /*
    this.worker.on('update', _.bind(this.update, this));

    this.worker.on('error', function(err) {
      console.error(err.message);
    });
    */

    this.on('GhostObject_destroy', function(id) {
      ghosts[id] = undefined;
    });

    this.on('RigidBody_destroy', function(id) {
      bodies[id] = undefined;
    });

    this.on('Vehicle_destroy', function(id) {
      vehicles[id] = undefined;
    });

    this.on('Constraint_destroy', function(id) {
      constraints[id] = undefined;
    });

    this.on('KinematicCharacterController_destroy', function(id) {
      kinematicCharacterControllers[id] = undefined;
    });

    this.on('ghost_enter', _.bind(function(descriptor) {
      var objA = this.getObjectByDescriptor(descriptor.objectA),
          objB = this.getObjectByDescriptor(descriptor.objectB);

      if (objA && _.isFunction(objA.trigger)) {
        objA.trigger('ghost_enter', objB, objA);
      }

      if (objB && _.isFunction(objB.trigger)) {
        objB.trigger('ghost_enter', objA, objB); 
      }
    }, this));

    this.on('ghost_exit', _.bind(function(descriptor) {
      var objA = this.getObjectByDescriptor(descriptor.objectA),
          objB = this.getObjectByDescriptor(descriptor.objectB);

      objA.trigger('ghost_exit', objB, objA);
      objB.trigger('ghost_exit', objA, objB); 
    }, this));

    function proxyMethod(method) {
      context[method] = function() {
        return context.worker[method].apply(context.worker, arguments);
      };
    }

    this.setStep(opts.step);
    this.setIterations(opts.iterations);
    this.setGravity(opts.gravity);
  }

  AmmoProxy.prototype.onCommand = function(command) {
    if (command.data.command === 'console') {
      var method = console[command.data.arguments[0]] ? command.data.arguments[0] : 'log';
      if (typeof console[method].apply === 'undefined') {
        console[method](command.data.arguments[1].join(' '));
      }
      else {
        console[method].apply(console, command.data.arguments[1]);
      }
    } else if (command.data.command === 'event') {
      console.log(this);
      this.trigger.apply(this, command.data.arguments);
    } else if (command.data.command === 'response') {
      this.promises[command.data.reqId].resolve(command.data.descriptor);
      delete this.promises[command.data.reqId];
    } else if (command.data.command === 'update') {
      this.update(command.data.data);
    } else {
      console.log('unhandled command: ', command.data.command);
    }
  };

  AmmoProxy.prototype.setStep = function(step) {
    return this.execute('setStep', { step: step });
  };

  AmmoProxy.prototype.getStats = function() {
    return this.execute('getStats', {});
  };

  AmmoProxy.prototype.setGravity = function(gravity) {
    return this.execute('setGravity', { gravity: gravity });
  };

  AmmoProxy.prototype.setIterations = function(iterations) {
    return this.execute('setIterations', { iterations: iterations });
  };

  AmmoProxy.prototype.startSimulation = function() {
    return this.execute('startSimulation', {});
  };

  AmmoProxy.prototype.stopSimulation = function() {
    return this.execute('stopSimulation', {});
  };

  AmmoProxy.prototype.createWorker = function() {
    window.URL = window.URL || window.webkitURL;

    var blob;
    try {
      blob = new Blob([AmmoWorkerAPI], { type: 'application/javascript' });
    } catch (e) { // Backwards-compatibility
      var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
      blob = new BlobBuilder();
      blob.append(AmmoWorkerAPI);
      blob = blob.getBlob();
    }
    var url = window.URL.createObjectURL(blob);
    this.worker = new Worker(url);
  };

  AmmoProxy.prototype.getObjectByDescriptor = function(descriptor) {
    switch (descriptor.type) {
    case 'rigidBody':
      return this.bodies[descriptor.id];

    case 'ghost':
      return this.ghosts[descriptor.id];

    default:
      return console.error('unknown type: ', descriptor.type);
    }
  };

  AmmoProxy.prototype.execute = function(method, descriptor) {
    //return this.worker.postMessage({[method](descriptor);
      /*

    this.worker.Vehicle_create(descriptor).then(_.bind(function(vehicleId) {
      var proxy = this;
      setTimeout(function() {
        var vehicle = new AmmoVehicle(proxy, vehicleId, rigidBody);
        proxy.vehicles[vehicleId] = vehicle;
        deferred.resolve(vehicle);
      }, 0);
    }, this));

  */

    var reqId = this.reqId++,
        deferred = when.defer();

    this.worker.postMessage({
      reqId: reqId,
      method: method,
      descriptor: descriptor
    });

    this.promises[reqId] = deferred;

    return deferred.promise;
  };

  AmmoProxy.prototype.aabbTest = function(min, max) {
    return this.execute('Broadphase_aabbTest', { min: {
        x: min.x,
        y: min.y,
        z: min.z
      },
      max: {
        x: max.x,
        y: max.y,
        z: max.z
      }
    });
  };

  AmmoProxy.prototype.rayTestClosest = function(rayFromWorld, rayToWorld) {
    return this.execute('DynamicsWorld_rayTestClosest', {
      rayFromWorld: rayFromWorld,
      rayToWorld: rayToWorld
    });
  };

  /*
  AmmoProxy.prototype.rayTestAllHits = function(rayFromWorld, rayToWorld) {
    return this.execute('DynamicsWorld_rayTestAllHits', {
      rayFromWorld: rayFromWorld,
      rayToWorld: rayToWorld
    });
  };
  */

  AmmoProxy.prototype.createVehicle = function(rigidBody, tuning) {
    var descriptor = {
      bodyId: rigidBody instanceof AmmoRigidBody ? rigidBody.bodyId : rigidBody,
      tuning: tuning
    };

    var deferred = when.defer();

    this.worker.Vehicle_create(descriptor).then(_.bind(function(vehicleId) {
      var proxy = this;
      setTimeout(function() {
        var vehicle = new AmmoVehicle(proxy, vehicleId, rigidBody);
        proxy.vehicles[vehicleId] = vehicle;
        deferred.resolve(vehicle);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createGhostObject = function(shape, position, quaternion) {
    var descriptor = {
        shape: shape,
        position: position,
        quaternion: quaternion
      },
      deferred = when.defer();

    this.worker.GhostObject_create(descriptor).then(_.bind(function(ghostId) {
      var proxy = this;
      setTimeout(function() {
        var ghost = new AmmoGhostObject(proxy, ghostId); 
        proxy.ghosts[ghostId] = ghost;
        deferred.resolve(ghost);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createKinematicCharacterController = function(shape, position, quaternion, stepHeight) {
    var descriptor = {
        shape: shape,
        position: position,
        quaternion: quaternion,
        stepHeight: stepHeight
      },
      deferred = when.defer();

    this.worker.KinematicCharacterController_create(descriptor).then(_.bind(function(kinematicCharacterControllerId) {
      var proxy = this;
      setTimeout(function() {
        var controller = new AmmoKinematicCharacterController(proxy, kinematicCharacterControllerId); 
        proxy.kinematicCharacterControllers[kinematicCharacterControllerId] = controller;
        deferred.resolve(controller);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createRigidBody = function(shape, mass, position, quaternion) {
    var descriptor = {
        shape: shape,
        mass: mass,
        position: position,
        quaternion: quaternion
      },
      deferred = when.defer();

    this.execute('RigidBody_create', descriptor).then(_.bind(function(bodyId) {
      var proxy = this;
      setTimeout(function() {
        var body = new AmmoRigidBody(proxy, bodyId); 
        proxy.bodies[bodyId] = body;
        deferred.resolve(body);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createPoint2PointConstraint = function(bodyA, bodyB, pivotA, pivotB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,

        pivotA: { x: pivotA.x, y: pivotA.y, z: pivotA.z },
        pivotB: { x: pivotB.x, y: pivotB.y, z: pivotB.z }
      },
      deferred = when.defer();

    this.execute('Point2PointConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoPoint2PointConstraint(proxy, constraintId); 
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createSliderConstraint = function(bodyA, bodyB, frameInA, frameInB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,
        frameInA: {
          position: {
            x: frameInA.position.x,
            y: frameInA.position.y,
            z: frameInA.position.z
          },
          rotation: {
            x: frameInA.rotation.x,
            y: frameInA.rotation.y,
            z: frameInA.rotation.z,
            w: frameInA.rotation.w
          }
        },
        frameInB: {
          position: {
            x: frameInB.position.x,
            y: frameInB.position.y,
            z: frameInB.position.z
          },
          rotation: {
            x: frameInB.rotation.x,
            y: frameInB.rotation.y,
            z: frameInB.rotation.z,
            w: frameInB.rotation.w
          }
        }
      },
      deferred = when.defer();

    this.execute('SliderConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoSliderConstraint(proxy, constraintId); 
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createHingeConstraint = function(bodyA, bodyB, pivotA, pivotB, axisA, axisB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,
        pivotA: { x: pivotA.x, y: pivotA.y, z: pivotA.z },
        pivotB: { x: pivotB.x, y: pivotB.y, z: pivotB.z },
        axisA: { x: axisA.x, y: axisA.y, z: axisA.z },
        axisB: { x: axisB.x, y: axisB.y, z: axisB.z }
      },
      deferred = when.defer();

    this.execute('HingeConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoHingeConstraint(proxy, constraintId);
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.update = function(data) {
    if (this.next) {
      //this.worker.swap(this.data && this.data.buffer);
      if (this.data) {
        this.worker.postMessage({ method: 'swap', data: this.data.buffer }, [ this.data.buffer ]);
      } else {
        this.worker.postMessage({ method: 'swap', data: undefined });
      }
      this.data = this.next;
    }
    this.next = new Float64Array(data);
  };

  AmmoProxy.prototype.createGhostObjectFromObject = function(object, shape) {
    return this.adapter.createGhostObjectFromObject(object, shape);
  };

  AmmoProxy.prototype.createRigidBodyFromObject = function(object, mass, shape) {
    return this.adapter.createRigidBodyFromObject(object, mass, shape); 
  };


  AmmoProxy.prototype.createKinematicCharacterControllerFromObject = function(object, shape, stepHeight) {
    return this.adapter.createKinematicCharacterControllerFromObject(object, shape, stepHeight);
  };

  AmmoProxy.prototype.getGhostObjectOffset = function(ghostObjectId) {
    return (this.opts.maxBodies * 7) + (this.opts.maxVehicles * 8 * 7) + (this.opts.maxKinematicCharacterControllers * 7) + (ghostObjectId * 7);
  };

  AmmoProxy.prototype.getRigidBodyOffset = function(bodyId) {
    return bodyId * 7;
  };

  AmmoProxy.prototype.getWheelOffset = function(vehicleId, wheelIndex) {
    return (this.opts.maxBodies * 7) + (vehicleId * 8 * 7) + (wheelIndex * 7);
  };

  AmmoProxy.prototype.getVehicle = function(vehicleId) {
    if (this.vehicles[vehicleId]) {
      return this.vehicles[vehicleId];
    }

    console.warn('Asked for non-existent vehicle with ID: ' + vehicleId);
  };

  AmmoProxy.prototype.getKinematicCharacterControllerOffset = function(kinematicCharacterControllerId) {
    return (this.opts.maxBodies * 7) + (this.opts.maxVehicles * 8 * 7) + (kinematicCharacterControllerId * 7);
  };

  AmmoProxy.prototype.getConstraint = function(constraintId) {
    if (this.constraints[constraintId]) {
      return this.constraints[constraintId];
    }

    console.warn('Asked for non-existent constraint with ID: ' + constraintId);
  };

  AmmoProxy.prototype.getRigidBody = function(rigidBodyId) {
    if (this.bodies[rigidBodyId]) {
      return this.bodies[rigidBodyId];
    }

    console.warn('Asked for non-existent rigid body with ID: ' + rigidBodyId);
  };

  AmmoProxy.prototype.getGhostObject = function(ghostObjectId) {
    if (this.ghosts[ghostObjectId]) {
      return this.ghosts[ghostObjectId];
    }

    console.warn('Asked for non-existent ghost object with ID: ' + ghostObjectId);
  };

  _.extend(AmmoProxy.prototype, Events);

  return AmmoProxy;
});
