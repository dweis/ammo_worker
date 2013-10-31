define([ 'underscore', 'three/three_binding' ], function(_, THREEBinding) {
  function THREEAdapter(proxy) {
    this.proxy  = proxy;
  }

  THREEAdapter.prototype.createBinding = function(object, offset) {
    return new THREEBinding(this.proxy, object, offset);
  };

  THREEAdapter.prototype.createRigidBodyFromObject = function(object, mass, shape) {
    if (!shape) {
      shape = this._getShapeJSON(object);
    }

    var descriptor = {
      mass: mass,
      shape: shape,
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      quaternion: {
        x: object.quaternion.x,
        y: object.quaternion.y,
        z: object.quaternion.z,
        w: object.quaternion.w
      }
    };

    var deferred = this.proxy.createRigidBody(descriptor);

    deferred.then(_.bind(function(rigidBody) {
      rigidBody.binding = this.createBinding(object, this.proxy.getRigidBodyOffset(rigidBody.bodyId));
    }, this));

    return deferred;
  };

  THREEAdapter.prototype._getShapeJSON = function(o, opts) {
    opts = opts || {};
    opts.strategy = opts.strategy || 'compound_bounding_box';

    switch(opts.strategy) {
      case 'compound_bounding_box':
        return this._createBoundingBoxCompoundShape(o);

      default:
        throw new Error('Unknown strategy: ' + opts.strategy);
    }
  };

  THREEAdapter.prototype._createBoundingBoxCompoundShape = function(o) {
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

  return THREEAdapter;
});
