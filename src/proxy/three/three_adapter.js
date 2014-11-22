var _ = require('underscore'),
    THREEBinding = require('./three_binding');

function THREEAdapter(proxy) {
  this.proxy  = proxy;
}

THREEAdapter.prototype.createBinding = function(object, offset) {
  return new THREEBinding(this.proxy, object, offset);
};

THREEAdapter.prototype.createRigidBodyFromObject = function(object, mass, shape) {
  if (!shape) {
    shape = this._getShapeJSON(object);
  } else if (shape.shape === 'auto') {
    shape = this._getShapeJSON(object, { strategy: shape.strategy });
  }

  var position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    },
    quaternion = {
      x: object.quaternion.x,
      y: object.quaternion.y,
      z: object.quaternion.z,
      w: object.quaternion.w
    };

  var deferred = this.proxy.createRigidBody(shape, mass, position, quaternion);

  deferred.then(_.bind(function(rigidBody) {
    rigidBody.binding = this.createBinding(object, rigidBody.bodyId);
  }, this));

  return deferred;
};

THREEAdapter.prototype.createKinematicCharacterControllerFromObject = function(object, shape, stepHeight) {
  if (!shape) {
    shape = this._getShapeJSON(object);
  } else if (shape.shape === 'auto') {
    shape = this._getShapeJSON(object, { strategy: shape.strategy });
  }

  var position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    },
    quaternion = {
      x: object.quaternion.x,
      y: object.quaternion.y,
      z: object.quaternion.z,
      w: object.quaternion.w
    };

  var deferred = this.proxy.createKinematicCharacterController(shape, position, quaternion, stepHeight);

  deferred.then(_.bind(function(kinematicCharacterController) {
    kinematicCharacterController.binding =
      this.createBinding(object, kinematicCharacterController.controllerId);
  }, this));

  return deferred;
};

THREEAdapter.prototype.createGhostObjectFromObject = function(object, shape) {
  if (!shape) {
    shape = this._getShapeJSON(object);
  } else if (shape.shape === 'auto') {
    shape = this._getShapeJSON(object, { strategy: shape.strategy });
  }

  var position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    },
    quaternion = {
      x: object.quaternion.x,
      y: object.quaternion.y,
      z: object.quaternion.z,
      w: object.quaternion.w
    };

  var deferred = this.proxy.createGhostObject(shape, position, quaternion);

  deferred.then(_.bind(function(ghostObject) {
    ghostObject.binding = this.createBinding(object, ghostObject.ghostId);
  }, this));

  return deferred;
};

THREEAdapter.prototype.createCollisionObjectFromObject = function(object, shape) {
  if (!shape) {
    shape = this._getShapeJSON(object);
  } else if (shape.shape === 'auto') {
    shape = this._getShapeJSON(object, { strategy: shape.strategy });
  }

  var position = {
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    },
    quaternion = {
      x: object.quaternion.x,
      y: object.quaternion.y,
      z: object.quaternion.z,
      w: object.quaternion.w
    };

  var deferred = this.proxy.createCollisionObject(shape, position, quaternion);

  //deferred.then(_.bind(function(collisionObject) {
    //ghostObject.binding = this.createBinding(object, this.proxy.getGhostObjectOffset(ghostObject.ghostId));
  //}, this));

  return deferred;
};

THREEAdapter.prototype._getShapeJSON = function(o, opts) {
  opts = opts || {};
  opts.strategy = opts.strategy || 'compound_bounding_box';

  switch(opts.strategy) {
  case 'compound_bounding_box':
    return this._createBoundingBoxCompoundShape(o);

  case 'bvh_triangle_mesh':
    return this._createBvhTriangleMeshShape(o);

  case 'convex_triangle_mesh':
    return this._createConvexTriangleMeshShape(o);

  case 'convex_hull_mesh':
    return this._createConvexHullMeshShape(o);

  default:
    throw new Error('Unknown strategy: ' + opts.strategy);
  }
};

THREEAdapter.prototype._createConvexTriangleMeshShape = function(o) {
  var json = {
    'shape': 'convex_triangle_mesh',
    'triangles': []
  };

  return this._createTriangleMeshShape(o, json);
};

THREEAdapter.prototype._createBvhTriangleMeshShape = function(o) {
  var json = {
    'shape': 'bvh_triangle_mesh',
    'triangles': []
  };

  return this._createTriangleMeshShape(o, json);
};

THREEAdapter.prototype._createBoundingBoxCompoundShape = function(o) {
  var inverseParent = new THREE.Matrix4();

  inverseParent.getInverse(o.matrixWorld);

  var json = {
    'shape': 'compound',
    'children': [
    ]
  };

  o.traverse(function(child) {
    var tmpMatrix = new THREE.Matrix4(),
        min, 
        max, 
        halfExtents = new THREE.Vector3(),
        position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();

    if (child instanceof THREE.Mesh && !child.isBB) {
      tmpMatrix.copy(inverseParent);
      tmpMatrix.multiply(child.matrixWorld);
      scale.setFromMatrixScale(child.matrixWorld);

      position.setFromMatrixPosition(tmpMatrix);
      tmpMatrix.extractRotation(tmpMatrix);
      rotation.setFromRotationMatrix(tmpMatrix);

      child.geometry.computeBoundingBox();
      min = child.geometry.boundingBox.min.clone();
      max = child.geometry.boundingBox.max.clone();

      halfExtents.subVectors(max, min);
      halfExtents.multiplyScalar(0.5);
      halfExtents.multiplyVectors(halfExtents, scale);

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

THREEAdapter.prototype._createConvexHullMeshShape = function(o) {
  var json = {
    shape: 'convex_hull_mesh',
    vertices: []
  },
  idx = 0;

  var inverseParent = new THREE.Matrix4(),
      tmpMatrix = new THREE.Matrix4();

  inverseParent.getInverse(o.matrixWorld);

  o.traverse(function(child) {
    var geometry = child.geometry,
        scale = new THREE.Vector3(),
        tmpVector3 = new THREE.Vector3(),
        i;

    tmpMatrix.copy(inverseParent);
    tmpMatrix.multiply(child.matrixWorld);

    if (child instanceof THREE.Mesh && !child.isBB) {
      scale.setFromMatrixScale(child.matrixWorld);

      if (geometry instanceof THREE.BufferGeometry) {
        if (!geometry.attributes.position.array) {
          return console.warn('BufferGeometry has no position attribute. Was it unloaded?');
        }

        var positions = geometry.attributes.position.array;

        for (i = 0; i < positions.length; i += 3) {
          tmpVector3.x = positions[ i + 0];
          tmpVector3.y = positions[ i + 1];
          tmpVector3.z = positions[ i + 2];

          tmpVector3.applyMatrix4(tmpMatrix);
          tmpVector3.multiply(o.scale);

          json.vertices[idx * 9 + 0] = tmpVector3.x;
          json.vertices[idx * 9 + 1] = tmpVector3.y;
          json.vertices[idx * 9 + 2] = tmpVector3.z;

          idx ++;
        }
      } else if (geometry instanceof THREE.Geometry) {
        for (i = 0; i < geometry.vertices.length; i++ ) {
          tmpVector3.copy(geometry.vertices[i]);
          tmpVector3.applyMatrix4(tmpMatrix);
          tmpVector3.multiply(o.scale);

          json.vertices[idx * 3 + 0] = tmpVector3.x;
          json.vertices[idx * 3 + 1] = tmpVector3.y;
          json.vertices[idx * 3 + 2] = tmpVector3.z;

          idx++;
        }
      }
    }
  });

  return json;
};

THREEAdapter.prototype._createTriangleMeshShape = function(o, json) {
  var inverseParent = new THREE.Matrix4(),
      tmpMatrix = new THREE.Matrix4(),
      tmpVector3 = new THREE.Vector3(),
      mesh,
      geometry,
      i,
      idx = 0,
      face;

  inverseParent.getInverse(o.matrixWorld);

  o.traverse(function(child) {
    if (child instanceof THREE.Mesh && !child.isBB) {
      geometry = child.geometry;
      mesh = child;

      tmpMatrix.copy(inverseParent);
      tmpMatrix.multiply(child.matrixWorld);

      if (geometry instanceof THREE.BufferGeometry) {
        if (!geometry.attributes.position.array) {
          return console.warn('BufferGeometry has no position attribute. Was it unloaded?');
        }
        var positions = geometry.attributes.position.array;
        var vA, vB, vC;
        var indices = geometry.attributes.index.array;
        var offsets = geometry.offsets;
        var il;

        // support for buffer geometry with and without chunks
        for (var j = 0, jl = offsets.length || 1; j < jl; ++ j ) {
          var start = offsets[j] && offsets[ j ].start || 0;
          var count = offsets[j] && offsets[ j ].count || indices.length / 3;
          var index = offsets[j] && offsets[ j ].index || 0;

          for (i = start, il = start + count; i < il; i += 3 ) {
            vA = index + indices[ i + 0 ];
            vB = index + indices[ i + 1 ];
            vC = index + indices[ i + 2 ];
            tmpVector3.x = positions[ vA * 3 ];
            tmpVector3.y = positions[ vA * 3 + 1];
            tmpVector3.z = positions[ vA * 3 + 2];

            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 0] = tmpVector3.x;
            json.triangles[idx * 9 + 1] = tmpVector3.y;
            json.triangles[idx * 9 + 2] = tmpVector3.z;

            tmpVector3.x = positions[ vB * 3 ];
            tmpVector3.y = positions[ vB * 3 + 1];
            tmpVector3.z = positions[ vB * 3 + 2];

            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 3] = tmpVector3.x;
            json.triangles[idx * 9 + 4] = tmpVector3.y;
            json.triangles[idx * 9 + 5] = tmpVector3.z;

            tmpVector3.x = positions[ vC * 3 ];
            tmpVector3.y = positions[ vC * 3 + 1];
            tmpVector3.z = positions[ vC * 3 + 2];

            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 6] = tmpVector3.x;
            json.triangles[idx * 9 + 7] = tmpVector3.y;
            json.triangles[idx * 9 + 8] = tmpVector3.z;

            idx ++;
          }
        }
      } else if (geometry instanceof THREE.Geometry) {
        for (i = 0; i < geometry.faces.length; i++) {
          face = geometry.faces[i];

          tmpVector3.copy(geometry.vertices[face.a]);
          tmpVector3.applyMatrix4(tmpMatrix);
          tmpVector3.multiply(o.scale);

          json.triangles[idx * 9 + 0] = tmpVector3.x;
          json.triangles[idx * 9 + 1] = tmpVector3.y;
          json.triangles[idx * 9 + 2] = tmpVector3.z;

          tmpVector3.copy(geometry.vertices[face.b]);
          tmpVector3.applyMatrix4(tmpMatrix);
          tmpVector3.multiply(o.scale);

          json.triangles[idx * 9 + 3] = tmpVector3.x;
          json.triangles[idx * 9 + 4] = tmpVector3.y;
          json.triangles[idx * 9 + 5] = tmpVector3.z;

          tmpVector3.copy(geometry.vertices[face.c]);
          tmpVector3.applyMatrix4(tmpMatrix);
          tmpVector3.multiply(o.scale);

          json.triangles[idx * 9 + 6] = tmpVector3.x;
          json.triangles[idx * 9 + 7] = tmpVector3.y;
          json.triangles[idx * 9 + 8] = tmpVector3.z;

          idx ++;
        }
      }
    }
  });

  return json;
};

module.exports = THREEAdapter;
