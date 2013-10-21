(function() {
  function AmmoWorker(opts) {
    var context = this, i, apiMethods = [
          'on', 'fire', 'addRigidBody', 'swap',
          'setStep', 'setIterations', 'setGravity',
          'startSimulation', 'stopSimulation'
        ];

    opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0},
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.memory = opts.memory || 256 * 1024 * 1024;
    opts.maxBodies = opts.maxBodies || 1000;

    this.worker = cw(new AmmoWorkerAPI(opts));

    for (i in apiMethods) {
      (function(method) {
        context[method] = function() {
          context.worker[method].apply(context.worker, arguments);
        }
      })(apiMethods[i]);
    }

    this.setStep(opts.step);
    this.setIterations(opts.iterations);
    this.setGravity(opts.gravity);
  }

  function AmmoWorkerAPI(opts) {
    this.memory = 1024 * 1024 * 1024;
    this.maxBodies = 1000;

    for (var i in opts) {
      this[i] = opts[i];
    }   
  }

  AmmoWorkerAPI.prototype = {
    init: function() {
      var Module = { TOTAL_MEMORY: this.memory },
          that = this;
      
      importScripts('./js/ammo.js');

      this.bodies = [];

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
          last;

      this.buffers = [
        new ArrayBuffer(this.maxBodies * 7 * 8),
        new ArrayBuffer(this.maxBodies * 7 * 8),
        new ArrayBuffer(this.maxBodies * 7 * 8)
      ];
      
      last = Date.now();
      this.simulationTimerId = setInterval(function() {
        var now = Date.now();
        var dt = now - last || 1;
        that.dynamicsWorld.stepSimulation(dt, that.iterations);
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
        
        var update;
        
        if (that.buffers.length > 0) {
          update = new Float64Array(that.buffers.pop());    
        }
        
        if (update && update.buffer instanceof ArrayBuffer) {
          for (var i in that.bodies) {
            if (that.bodies[i]) {
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

    addRigidBody: function(descriptor, fn) {
      var colShape,
          startTransform = new Ammo.btTransform(),
          isDynamic = (descriptor.mass != 0),
          localInertia = new Ammo.btVector3(0, 0, 0),
          myMotionState,
          rbInfo,
          body;
      
      if (descriptor.shape.shape === 'box') {
        colShape = new Ammo.btBoxShape(new Ammo.btVector3(descriptor.shape.halfExtents.x,
            descriptor.shape.halfExtents.y, descriptor.shape.halfExtents.z));
      } else if (descriptor.shape.shape === 'sphere') {
        colShape = new Ammo.btSphereShape(descriptor.shape.radius);
      } else if (descriptor.shape.shape === 'staticplane') {
        colShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(descriptor.shape.normal.x, descriptor.shape.normal.y, descriptor.shape.normal.z), descriptor.shape.distance);
      } else {
        return console.error('Unknown shape: ' + descriptor.shape.shape);
      }
      
      startTransform.setIdentity();
    
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
