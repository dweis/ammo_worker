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

  THREEAdapter.prototype._createTriangleMeshShape = function(o, json) {
    var inverseParent = new THREE.Matrix4(),
        tmpMatrix = new THREE.Matrix4(),
        tmpVector3 = new THREE.Vector3(),
        mesh,
        geometry,
        i,
        idx = 0,
        face;

    o.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        console.log(child);
        geometry = child.geometry;
        mesh = child;

        var position = new THREE.Vector3(),
            rotation = new THREE.Quaternion(),
            worldTransform = mesh.matrixWorld.clone(),
            scale = new THREE.Vector3();

        tmpMatrix.copy(inverseParent);
        tmpMatrix.multiply(worldTransform);

        position.getPositionFromMatrix(tmpMatrix);
        scale.getScaleFromMatrix(worldTransform);
        tmpMatrix.extractRotation(tmpMatrix);
        rotation.setFromRotationMatrix(tmpMatrix);

        if (geometry instanceof THREE.BufferGeometry) {
          var positions = geometry.attributes.position.array;
          var vA, vB, vC;
          var indices = geometry.attributes.index.array;
          var offsets = geometry.offsets;
          var il;

          for (var j = 0, jl = offsets.length; j < jl; ++ j ) {
            var start = offsets[ j ].start;
            var count = offsets[ j ].count;
            var index = offsets[ j ].index;

            for (i = start, il = start + count; i < il; i += 3 ) {
              vA = index + indices[ i + 0 ];
              vB = index + indices[ i + 1 ];
              vC = index + indices[ i + 2 ];
              tmpVector3.x = positions[ vA * 3 ];
              tmpVector3.y = positions[ vA * 3 + 1];
              tmpVector3.z = positions[ vA * 3 + 2];

              tmpVector3.multiply(scale);

              json.triangles[idx * 9 + 0] = tmpVector3.x;
              json.triangles[idx * 9 + 1] = tmpVector3.y;
              json.triangles[idx * 9 + 2] = tmpVector3.z;

              tmpVector3.x = positions[ vB * 3 ];
              tmpVector3.y = positions[ vB * 3 + 1];
              tmpVector3.z = positions[ vB * 3 + 2];

              tmpVector3.multiply(scale);

              json.triangles[idx * 9 + 3] = tmpVector3.x;
              json.triangles[idx * 9 + 4] = tmpVector3.y;
              json.triangles[idx * 9 + 5] = tmpVector3.z;

              tmpVector3.x = positions[ vC * 3 ];
              tmpVector3.y = positions[ vC * 3 + 1];
              tmpVector3.z = positions[ vC * 3 + 2];

              tmpVector3.multiply(scale);

              json.triangles[idx * 9 + 6] = tmpVector3.x;
              json.triangles[idx * 9 + 7] = tmpVector3.y;
              json.triangles[idx * 9 + 8] = tmpVector3.z;

              idx ++;
            }
          }
        } else if (geometry instanceof THREE.Geometry) {
          for (i = 0; i < geometry.faces.length; i++) {
            console.log(i);
            face = geometry.faces[i];

            tmpVector3.copy(geometry.vertices[face.a]);
            tmpVector3.multiply(scale);

            json.triangles[idx * 9 + 0] = tmpVector3.x;
            json.triangles[idx * 9 + 1] = tmpVector3.y;
            json.triangles[idx * 9 + 2] = tmpVector3.z;

            tmpVector3.copy(geometry.vertices[face.b]);
            tmpVector3.multiply(scale);

            json.triangles[idx * 9 + 3] = tmpVector3.x;
            json.triangles[idx * 9 + 4] = tmpVector3.y;
            json.triangles[idx * 9 + 5] = tmpVector3.z;

            tmpVector3.copy(geometry.vertices[face.c]);
            tmpVector3.multiply(scale);

            json.triangles[idx * 9 + 6] = tmpVector3.x;
            json.triangles[idx * 9 + 7] = tmpVector3.y;
            json.triangles[idx * 9 + 8] = tmpVector3.z;

            idx ++;
          }
        }
      }
        // for (var i = 0; i < triangles.length / 9; i++) {
        //   console.log('x: ' + triangles[i * 9 + 0] + ' y: ' + triangles[i * 9 + 1] + ' z: ' + triangles[i * 9 + 2]);  
        //   console.log('x: ' + triangles[i * 9 + 3] + ' y: ' + triangles[i * 9 + 4] + ' z: ' + triangles[i * 9 + 5]);  
        //   console.log('x: ' + triangles[i * 9 + 6] + ' y: ' + triangles[i * 9 + 7] + ' z: ' + triangles[i * 9 + 8]);  
        // }

          /*
        o.position.x = (Math.random() * 30) - 15;
        o.position.y = 20 + (Math.random() * 20) - 5;
        o.position.z = (Math.random() * 30) - 15;
        */
    });

    return json;
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

  THREEAdapter.prototype._createConvexHullMeshShape = function(o) {
    var json = {
      shape: 'convex_hull_mesh',
      vertices: []
    },
    idx = 0;

    o.traverse(function(child) {
      var geometry = child.geometry,
          scale = new THREE.Vector3(),
          tmpVector3 = new THREE.Vector3(),
          i;

      if (child instanceof THREE.Mesh) {
        scale.getScaleFromMatrix(child.matrixWorld);

        if (geometry instanceof THREE.BufferGeometry) {
          var positions = geometry.attributes.position.array;

          for (i = 0; i < positions.length; i += 3) {
            tmpVector3.x = positions[ i + 0 ];
            tmpVector3.y = positions[ i + 1];
            tmpVector3.z = positions[ i + 2];

            tmpVector3.multiply(scale);

            json.vertices[idx * 9 + 0] = tmpVector3.x;
            json.vertices[idx * 9 + 1] = tmpVector3.y;
            json.vertices[idx * 9 + 2] = tmpVector3.z;

            idx ++;
          }
        } else if (geometry instanceof THREE.Geometry) {
          for (i = 0; i < geometry.vertices.length; i++ ) {
            tmpVector3.copy(geometry.vertices[i]);
            tmpVector3.multiply(scale);

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

  return THREEAdapter;
});
