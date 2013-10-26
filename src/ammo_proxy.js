define([ 'underscore', 'ammo_worker_api' ], function(_, AmmoWorkerAPI) {
  function AmmoWorker(opts) {
    var context = this, i, apiMethods = [
      'on', 'fire', 'addRigidBody', 'setStep', 
      'setIterations', 'setGravity', 'startSimulation', 
      'stopSimulation', 'addVehicle', 'removeVehicle', 
      'addWheel', 'applyEngineForce', 'setBrake', 
      'setSteeringValue', 'setWheelInfo'
    ];

    opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0};
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.maxBodies = opts.maxBodies || 1000;
    opts.maxVehicles = opts.maxVehicles || 32;
    opts.maxWheelsPerVehicle = opts.maxWheelsPerVehicle || 8;

    this.worker = cw(new AmmoWorkerAPI(opts));

    this.worker.on('update', _.bind(this.update, this));

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

  AmmoWorker.prototype.update = function(data) {
    if (this.next) {
      this.worker.swap(this.data && this.data.buffer);
      this.data = this.next;
    }
    this.next = new Float64Array(data);
  };

  AmmoWorker.prototype.addRigidBodyObject = function(o, mass, shape) {
    if (!shape) {
      shape = this.getShapeJSON(o);
    }

    var descriptor = {
      mass: mass,
      shape: shape,
      position: {
        x: o.position.x,
        y: o.position.y,
        z: o.position.z
      },
      quaternion: {
        x: o.quaternion.x,
        y: o.quaternion.y,
        z: o.quaternion.z,
        w: o.quaternion.w
      }
    };

    return this.worker.addRigidBody(descriptor);
  };

  AmmoWorker.prototype.updateBody = function(object, idx) {
    var position, quaternion, pos;

    if (this.data) {
      pos = idx * 7;

      position = object.position;
      quaternion = object.quaternion;

      position.x = this.data[pos + 0];
      position.y = this.data[pos + 1];
      position.z = this.data[pos + 2];
      quaternion.x = this.data[pos + 3];
      quaternion.y = this.data[pos + 4];
      quaternion.z = this.data[pos + 5];
      quaternion.w = this.data[pos + 6];
    }
  };

  AmmoWorker.prototype.updateWheel = function(object, vehicleIdx, wheelIdx) {
    var position, quaternion, pos;

    if (this.data) {
      pos = (1000 * 7) + (vehicleIdx * 8 * 7) + (wheelIdx * 7);

      position = object.position;
      quaternion = object.quaternion;  

      position.x = this.data[pos + 0];
      position.y = this.data[pos + 1];
      position.z = this.data[pos + 2];
      quaternion.x = this.data[pos + 3];
      quaternion.y = this.data[pos + 4];
      quaternion.z = this.data[pos + 5];
      quaternion.w = this.data[pos + 6];
    }
  };

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

  return AmmoWorker;
});
