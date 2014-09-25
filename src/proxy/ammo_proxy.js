var when = require('when'),
    _ = require('underscore'),
    Events = require('../vendor/backbone.events'),
    AmmoCollisionObject = require('./ammo_collision_object'),
    AmmoRigidBody = require('./ammo_rigid_body'),
    AmmoVehicle = require('./ammo_vehicle'),
    AmmoPoint2PointConstraint = require('./ammo_point2point_constraint'),
    AmmoHingeConstraint = require('./ammo_hinge_constraint'),
    AmmoSliderConstraint = require('./ammo_slider_constraint'),
    AmmoConeTwistConstraint = require('./ammo_conetwist_constraint'),
    AmmoGeneric6DofConstraint = require('./ammo_generic_6dof_constraint'),
    AmmoGhostObject = require('./ammo_ghost_object'),
    AmmoKinematicCharacterController = require('./ammo_kinematic_character_controller'),
    THREEAdapter = require('./three/three_adapter');

function AmmoProxy(opts) {
  this.reqId = 0;

  this.promises = {};

  this.createWorker();

  _.bindAll(this);

  this.worker.addEventListener('message', this.onCommand, false);
  //this.worker.addEventListener('error', this.onError, false);

  opts = this.opts = opts || {};
  opts.unitsToMeters = opts.unitsToMeters || 1;
  opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0};
  opts.iterations = opts.iterations || 10;
  opts.step = opts.step || 1/60;

  var objects = this.objects = new Array(4000);

  this.adapter = new THREEAdapter(this);

  this.on('destroy', function(id) {
    if (objects[id]) {
      objects[id].trigger('destroy');
      objects[id] = undefined;
    }
  });

  this.setUnitsToMeters(opts.unitsToMeters);
  this.setStep(opts.step);
  this.setIterations(opts.iterations);
  this.setGravity(opts.gravity);

  this.buffers = [];
}

AmmoProxy.prototype.beginContact = function(idA, idB) {
  var objA = this.objects[idA],
      objB = this.objects[idB];

  if (objA) {
    objA.trigger('begin_contact', objB, objA);
  }

  if (objB) {
    objB.trigger('begin_contact', objA, objB);
  }
};

AmmoProxy.prototype.endContact = function(idA, idB) {
  var objA = this.objects[idA],
      objB = this.objects[idB];

  if (objA) {
    objA.trigger('end_contact', objB, objA);
  }

  if (objB) {
    objB.trigger('end_contact', objA, objB);
  }
};

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
    switch(command.data.arguments[0]) {
    case 'begin_contact':
      return this.beginContact(command.data.arguments[1], command.data.arguments[2]);
    case 'end_contact':
      return this.endContact(command.data.arguments[1], command.data.arguments[2]);
    default:
      return this.trigger.apply(this, command.data.arguments);
    }
  } else if (command.data.command === 'response') {
    this.promises[command.data.reqId].resolve(command.data.descriptor);
    delete this.promises[command.data.reqId];
  } else if (command.data.command === 'update') {
    this.update(command.data.data);
  } else {
    console.warn('unhandled command: ', command.data.command);
  }
};

AmmoProxy.prototype.onError = function() {
  console.error(arguments);
};

AmmoProxy.prototype.setStep = function(step) {
  return this.execute('setStep', { step: step });
};

AmmoProxy.prototype.setUnitsToMeters = function(unitsToMeters) {
  return this.execute('setUnitsToMeters', { unitsToMeters: unitsToMeters });
};

AmmoProxy.prototype.getStats = function() {
  return this.execute('getStats', {}, true);
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

AmmoProxy.prototype.execute = function(method, descriptor, promise) {
  var deferred,
      message;

  message = {
    method: method,
    descriptor: descriptor
  };

  if (promise) {
    message.reqId = this.reqId++;
    deferred = when.defer();
  }

  this.worker.postMessage(message);

  if (deferred) {
    this.promises[message.reqId] = deferred;
    return deferred.promise;
  }
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
  }, true);
};

AmmoProxy.prototype.rayTestClosest = function(rayFromWorld, rayToWorld) {
  return this.execute('DynamicsWorld_rayTestClosest', {
    rayFromWorld: rayFromWorld,
    rayToWorld: rayToWorld
  }, true);
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

  this.execute('Vehicle_create', descriptor, true).then(_.bind(function(vehicleId) {
    var proxy = this;
    setTimeout(function() {
      var vehicle = new AmmoVehicle(proxy, vehicleId, rigidBody);
      proxy.objects[vehicleId] = vehicle;
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

  this.execute('GhostObject_create', descriptor, true).then(_.bind(function(ghostId) {
    var proxy = this;
    setTimeout(function() {
      var ghost = new AmmoGhostObject(proxy, ghostId);
      proxy.objects[ghostId] = ghost;
      deferred.resolve(ghost);
    }, 0);
  }, this));

  return deferred.promise;
};

AmmoProxy.prototype.createCollisionObject = function(shape, position, quaternion) {
  var descriptor = {
      shape: shape,
      position: position,
      quaternion: quaternion
    },
    deferred = when.defer();

  this.execute('CollisionObject_create', descriptor, true).then(_.bind(function(collisionObjectId) {
    var proxy = this;
    setTimeout(function() {
      var collisionObject = new AmmoCollisionObject(proxy, collisionObjectId);
      proxy.objects[collisionObjectId] = collisionObject;
      deferred.resolve(collisionObject);
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

  this.execute('KinematicCharacterController_create', descriptor, true).then(_.bind(function(kinematicCharacterControllerId) {
    var proxy = this;
    setTimeout(function() {
      var controller = new AmmoKinematicCharacterController(proxy, kinematicCharacterControllerId);
      proxy.objects[kinematicCharacterControllerId] = controller;
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

  this.execute('RigidBody_create', descriptor, true).then(_.bind(function(bodyId) {
    var proxy = this;
    setTimeout(function() {
      var body = new AmmoRigidBody(proxy, bodyId);
      proxy.objects[bodyId] = body;
      deferred.resolve(body);
    }, 0);
  }, this));

  return deferred.promise;
};

AmmoProxy.prototype.createPoint2PointConstraint = function(bodyA, bodyB, pivotA, pivotB) {
  var descriptor = {
      rigidBodyIdA: bodyA.bodyId,
      pivotA: { x: pivotA.x, y: pivotA.y, z: pivotA.z }
    },
    deferred = when.defer();

  if (bodyB) {
    descriptor.rigidBodyIdB = bodyB.bodyId;
  }

  if (pivotB) {
    descriptor.pivotB = { x: pivotB.x, y: pivotB.y, z: pivotB.z };
  }

  this.execute('Point2PointConstraint_create', descriptor, true).then(_.bind(function(constraintId) {
    var proxy = this;
    setTimeout(function() {
      var constraint = new AmmoPoint2PointConstraint(proxy, constraintId);
      proxy.objects[constraintId] = constraint;
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

  this.execute('SliderConstraint_create', descriptor, true).then(_.bind(function(constraintId) {
    var proxy = this;
    setTimeout(function() {
      var constraint = new AmmoSliderConstraint(proxy, constraintId);
      proxy.objects[constraintId] = constraint;
      deferred.resolve(constraint);
    }, 0);
  },this));

  return deferred.promise;
};

AmmoProxy.prototype.createGeneric6DofConstraint = function(bodyA, bodyB, rbAFrame, rbBFrame, useLinearReference) {
  var descriptor = {
      rigidBodyIdA: bodyA.bodyId,
      rigidBodyIdB: bodyB.bodyId,
      rbAFrame: {
        position: {
          x: rbAFrame.position.x,
          y: rbAFrame.position.y,
          z: rbAFrame.position.z
        },
        rotation: {
          x: rbAFrame.rotation.x,
          y: rbAFrame.rotation.y,
          z: rbAFrame.rotation.z,
          w: rbAFrame.rotation.w
        }
      },
      rbBFrame: {
        position: {
          x: rbBFrame.position.x,
          y: rbBFrame.position.y,
          z: rbBFrame.position.z
        },
        rotation: {
          x: rbBFrame.rotation.x,
          y: rbBFrame.rotation.y,
          z: rbBFrame.rotation.z,
          w: rbBFrame.rotation.w
        }
      },
      useLinearReference: useLinearReference
    },
    deferred = when.defer();

  this.execute('Generic6DofConstraint_create', descriptor, true).then(_.bind(function(constraintId) {
    var proxy = this;
    setTimeout(function() {
      var constraint = new AmmoGeneric6DofConstraint(proxy, constraintId);
      proxy.objects[constraintId] = constraint;
      deferred.resolve(constraint);
    }, 0);
  },this));

  return deferred.promise;
};

AmmoProxy.prototype.createConeTwistConstraint = function(bodyA, bodyB, rbAFrame, rbBFrame) {
  var descriptor = {
      rigidBodyIdA: bodyA.bodyId,
      rigidBodyIdB: bodyB.bodyId,
      rbAFrame: {
        position: {
          x: rbAFrame.position.x,
          y: rbAFrame.position.y,
          z: rbAFrame.position.z
        },
        rotation: {
          x: rbAFrame.rotation.x,
          y: rbAFrame.rotation.y,
          z: rbAFrame.rotation.z,
          w: rbAFrame.rotation.w
        }
      },
      rbBFrame: {
        position: {
          x: rbBFrame.position.x,
          y: rbBFrame.position.y,
          z: rbBFrame.position.z
        },
        rotation: {
          x: rbBFrame.rotation.x,
          y: rbBFrame.rotation.y,
          z: rbBFrame.rotation.z,
          w: rbBFrame.rotation.w
        }
      }
    },
    deferred = when.defer();

  this.execute('ConeTwistConstraint_create', descriptor, true).then(_.bind(function(constraintId) {
    var proxy = this;
    setTimeout(function() {
      var constraint = new AmmoConeTwistConstraint(proxy, constraintId);
      proxy.objects[constraintId] = constraint;
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

  this.execute('HingeConstraint_create', descriptor, true).then(_.bind(function(constraintId) {
    var proxy = this;
    setTimeout(function() {
      var constraint = new AmmoHingeConstraint(proxy, constraintId);
      proxy.objects[constraintId] = constraint;
      deferred.resolve(constraint);
    }, 0);
  },this));

  return deferred.promise;
};

AmmoProxy.prototype.update = function(data) {

  if (data) {
    this.buffers.push(new Float32Array(data));
  }

  if (this.data) {
    this.worker.postMessage({ method: 'swap', data: this.data.buffer }, [ this.data.buffer ]);
    this.data = undefined;
  }

  if (this.buffers.length) {
    this.data = this.buffers.shift();
  }
};

AmmoProxy.prototype.createCollisionObjectFromObject = function(object, shape) {
  return this.adapter.createCollisionObjectFromObject(object, shape);
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

AmmoProxy.prototype.setUserData = function(key, value) {
  this.execute('AmmoProxy_setUserData', { key: key, value: value });
};

AmmoProxy.prototype.runOnce = function(fn) {
  if (typeof fn !== 'function') {
    return console.error('fn is not a function!');
  }

  this.execute('AmmoProxy_runOnce', fn.toString());
};

AmmoProxy.prototype.runPostStep = function(fn) {
  if (typeof fn !== 'function') {
    return console.error('fn is not a function!');
  }

  var deferred = when.defer();

  this
    .execute('AmmoProxy_runPostStep', fn.toString(), true)
    .then(_.bind(function(fnId) {
      setTimeout(function() {
        deferred.resolve(fnId);
      }, 0);
    },this));

  return deferred.promise;
};

AmmoProxy.prototype.runPreStep = function(fn) {
  if (typeof fn !== 'function') {
    return console.error('fn is not a function!');
  }

  var deferred = when.defer();

  this
    .execute('AmmoProxy_runPreStep', fn.toString(), true)
    .then(_.bind(function(fnId) {
      setTimeout(function() {
        deferred.resolve(fnId);
      }, 0);
    },this));

  return deferred.promise;
};

_.extend(AmmoProxy.prototype, Events);

window._ = _;
module.exports = window.AmmoProxy = AmmoProxy;
