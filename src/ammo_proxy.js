define([ 'when', 'underscore', 'ammo_worker_api', 'ammo_rigid_body', 'ammo_vehicle', 
         'ammo_point2point_constraint', 'ammo_hinge_constraint', 'ammo_slider_constraint',
         'ammo_ghost_object', 'three/three_adapter' ], 
      function(when, _, AmmoWorkerAPI, AmmoRigidBody, AmmoVehicle, AmmoPoint2PointConstraint,
        AmmoHingeConstraint, AmmoSliderConstraint, AmmoGhostObject, THREEAdapter) {
  function AmmoProxy(opts) {
    var context = this, i, apiMethods = [
      'on', 'fire', 'setStep', 'setIterations', 'setGravity', 'startSimulation',
      'stopSimulation'
    ];

    opts = this.opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0};
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.maxBodies = opts.maxBodies || 1000;
    opts.maxVehicles = opts.maxVehicles || 32;
    opts.maxWheelsPerVehicle = opts.maxWheelsPerVehicle || 8;

    this.adapter = new THREEAdapter(this);

    this.worker = cw(new AmmoWorkerAPI(opts));

    this.worker.on('update', _.bind(this.update, this));

    this.worker.on('error', function(err) {
      console.warn(err.message);
    });

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

  AmmoProxy.prototype.execute = function(method, descriptor) {
    return this.worker[method](descriptor);
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

  AmmoProxy.prototype.createVehicle = function(rigidBody, tuning) {
    var descriptor = {
      bodyId: rigidBody instanceof AmmoRigidBody ? rigidBody.bodyId : rigidBody,
      tuning: tuning
    };

    var deferred = when.defer();

    this.worker.Vehicle_create(descriptor).then(_.bind(function(vehicleId) {
      var proxy = this;
      setTimeout(function() {
        deferred.resolve(new AmmoVehicle(proxy, vehicleId, rigidBody));
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
        deferred.resolve(new AmmoGhostObject(proxy, ghostId));
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

    this.worker.RigidBody_create(descriptor).then(_.bind(function(bodyId) {
      var proxy = this;
      setTimeout(function() {
        deferred.resolve(new AmmoRigidBody(proxy, bodyId));
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
        deferred.resolve(new AmmoPoint2PointConstraint(proxy, constraintId));
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
        deferred.resolve(new AmmoSliderConstraint(proxy, constraintId));
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
        deferred.resolve(new AmmoHingeConstraint(proxy, constraintId));
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.update = function(data) {
    if (this.next) {
      this.worker.swap(this.data && this.data.buffer);
      this.data = this.next;
    }
    this.next = new Float64Array(data);
  };

  AmmoProxy.prototype.createRigidBodyFromObject = function(object, mass, shape) {
    return this.adapter.createRigidBodyFromObject(object, mass, shape); 
  };

  AmmoProxy.prototype.getRigidBodyOffset = function(bodyId) {
    return bodyId * 7;
  };

  AmmoProxy.prototype.getWheelOffset = function(vehicleId, wheelIndex) {
    return (this.opts.maxBodies * 7) + (vehicleId * 8 * 7) + (wheelIndex * 7);
  };

  return AmmoProxy;
});
