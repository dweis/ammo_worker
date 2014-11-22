/* jshint evil: true */
'use strict';

var _ = require('underscore'),
    UserFunctions = require('./user_functions'),
    CollisionObjectMixin = require('./mixins/collision_object'),
    ConstraintMixin = require('./mixins/constraint'),
    DynamicsWorldMixin = require('./mixins/dynamics_world'),
    GhostObjectMixin = require('./mixins/ghost_object'),
    KinematicCharacterControllerMixin = require('./mixins/kinematic_character_controller'),
    RigidBodyMixin = require('./mixins/rigid_body'),
    ShapesMixin = require('./mixins/shapes'),
    VehicleMixin = require('./mixins/vehicle');

var MAX_TRANSFORMS = 4000;

var tmpVec = [
  new Ammo.btVector3(),
  new Ammo.btVector3()
];

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

function AmmoWorkerAPI() {
  _.bindAll(this);

  this.scaleFactor = 1;
}

AmmoWorkerAPI.prototype = {
  init: function() {
    var bufferSize = (7 * MAX_TRANSFORMS * 4);

    this.buffers = [
      new ArrayBuffer(bufferSize),
      new ArrayBuffer(bufferSize),
      /*
      new ArrayBuffer(bufferSize),
      new ArrayBuffer(bufferSize)
      */
    ];

    this.userFunctions = new UserFunctions(this);

    this.ids = _.range(0, MAX_TRANSFORMS);

    this.objects = new Array(MAX_TRANSFORMS);

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

  doStepAddContacts: function() {
    var dispatcher = this.dynamicsWorld.getDispatcher(),
        nManifolds = dispatcher.getNumManifolds(),
        manifold,
        nContacts,
        point,
        body1,
        body2,
        object1,
        object2;

    for (var i = 0; i < nManifolds; i++) {
      manifold = dispatcher.getManifoldByIndexInternal(i);

      nContacts = manifold.getNumContacts();

      if (nContacts > 0) {
        for (var j = 0; j < nContacts; j++) {
          point = manifold.getContactPoint(j);
          body1 = Ammo.castObject(manifold.getBody0(), Ammo.btCollisionObject);
          body2 = Ammo.castObject(manifold.getBody1(), Ammo.btCollisionObject);

          if (body1.userData && body2.userData) {
            object1 = this.objects[body1.userData.id];
            object2 = this.objects[body2.userData.id];

            if ((object1 && !object1.collisions[object2.id]) ||
                (object2 && !object2.collisions[object1.id])) {
              self.postMessage({ command: 'event', arguments: [
                  'begin_contact', object1.id, object2.id
                ]
              });
            }

            object1.collisions[object2.id] = this.frames;
            object2.collisions[object1.id] = this.frames;
          }
        }
      }
    }
  },

  doStepRemoveContacts: function() {
    var object1, object2;

    for (var i = 0; i < this.objects.length; i++) {
      object1 = this.objects[i];

      if (object1) {
        for (var j in object1.collisions) {
          if (object1.collisions[j] !== this.frames) {
            object2 = this.objects[j];

            if (object1) {
              delete object1.collisions[j];
            }

            if (object2) {
              delete object2.collisions[i];
            }

            if (object1 && object2) {
              self.postMessage({ command: 'event', arguments: [
                  'end_contact', object1.id, object2.id
                ]
              });
            }
          }
        }
      }
    }
  },

  doStep: function(delta) {
    var that = this, update, i;

    this.userFunctions.preStep(delta);
    that.dynamicsWorld.stepSimulation(delta/*that.step*/, that.iterations, that.step);

    if (that.buffers.length) {
      update = new Float32Array(that.buffers.pop());
    }

    if (update && update.buffer instanceof ArrayBuffer) {
      for (i = 0; i < MAX_TRANSFORMS; i++) {
        if (that.objects[i]) {
          that.objects[i].update(update, delta);
        }
      }
      this.doStepAddContacts();
      this.doStepRemoveContacts();

      self.postMessage({ command: 'update', data: update.buffer }, [update.buffer]);
    }

    this.userFunctions.postStep(delta);
  },

  startSimulation: function() {
    var that = this, last = Date.now();

    that.totalTime = 0;
    that.frames = 0;

    this.simulationTimerId = setInterval(function() {
      var now = Date.now(), delta = (now - last) / 1000;

      that.doStep(delta);

      that.frames ++;

      last = now;
      that.totalTime += delta;
      that.fps = Math.round( that.frames / that.totalTime );
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

  setUnitsToMeters: function(descriptor) {
    this.scaleFactor = descriptor.unitsToMeters;


    if (this.dynamicsWorld) {
      var gravity = this.dynamicsWorld.getGravity().op_mul(1/this.scaleFactor);

      this.dynamicsWorld.setGravity(gravity);
    } 
  },

  setStep: function(descriptor) {
    this.step = descriptor.step;
  },

  setIterations: function(descriptor) {
    this.iterations = descriptor.iterations;
  },

  setGravity: function(descriptor) {
    tmpVec[0].setX(descriptor.gravity.x / this.scaleFactor);
    tmpVec[0].setY(descriptor.gravity.y / this.scaleFactor);
    tmpVec[0].setZ(descriptor.gravity.z / this.scaleFactor);
    this.dynamicsWorld.setGravity(tmpVec[0]);
  },

  Broadphase_aabbTest: function(descriptor, fn) {
    var that = this;

    if (!this.aabbCallback) {
      this.aabbCallback = new Ammo.ConcreteBroadphaseAabbCallback();
      this.aabbCallback.bodies = [];

      this.aabbCallback.process = function(proxyPtr) {
        var proxy = Ammo.wrapPointer(proxyPtr, Ammo.btBroadphaseProxy);
        var clientObject = Ammo.castObject(proxy.get_m_clientObject(), Ammo.btRigidBody);

        if (clientObject.userData.id) {
          that.aabbCallback.bodies.push(clientObject.userData.id);
        }

        return true;
      };
    }

    tmpVec[0].setX(descriptor.min.x / this.scaleFactor);
    tmpVec[0].setY(descriptor.min.y / this.scaleFactor);
    tmpVec[0].setZ(descriptor.min.z / this.scaleFactor);

    tmpVec[1].setX(descriptor.max.x / this.scaleFactor);
    tmpVec[1].setY(descriptor.max.y / this.scaleFactor);
    tmpVec[1].setZ(descriptor.max.z / this.scaleFactor);

    this.aabbCallback.bodies = [];
    this.dynamicsWorld
      .getBroadphase()
      .aabbTest(tmpVec[0], tmpVec[1],
        this.aabbCallback);

    fn(this.aabbCallback.bodies);
  },

  AmmoProxy_setUserData: function(descriptor) {
    this.userFunctions[descriptor.key] = descriptor.value;
  },

  AmmoProxy_runOnce: function(userFn) {
    userFn = eval('(' + userFn + ')');
    this.userFunctions.runOnce(userFn);
  },

  AmmoProxy_runPreStep: function(userFn, fn) {
    userFn = eval('(' + userFn + ')');
    fn(this.userFunctions.runPreStep(userFn));
  },

  AmmoProxy_runPostStep: function(userFn, fn) {
    userFn = eval('(' + userFn + ')');
    fn(this.userFunctions.runPostStep(userFn));
  },

  trigger: function() {
    self.postMessage({ command: 'event', arguments: Array.prototype.slice.call(arguments, 0) });
  },

  shutdown: function() {
    Ammo.destroy(this.collisionConfiguration);
    Ammo.destroy(this.dispatcher);
    Ammo.destroy(this.overlappingPairCache);
    Ammo.destroy(this.solver);
  }
};

_.extend(AmmoWorkerAPI.prototype, CollisionObjectMixin);
_.extend(AmmoWorkerAPI.prototype, ConstraintMixin);
_.extend(AmmoWorkerAPI.prototype, DynamicsWorldMixin);
_.extend(AmmoWorkerAPI.prototype, GhostObjectMixin);
_.extend(AmmoWorkerAPI.prototype, KinematicCharacterControllerMixin);
_.extend(AmmoWorkerAPI.prototype, RigidBodyMixin);
_.extend(AmmoWorkerAPI.prototype, ShapesMixin);
_.extend(AmmoWorkerAPI.prototype, VehicleMixin);

var api = new AmmoWorkerAPI();
api.init();
