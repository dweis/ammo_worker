var tmpVec = [
    new Ammo.btVector3(),
    new Ammo.btVector3(),
    new Ammo.btVector3()
  ],
  tmpQuaternion = [
    new Ammo.btQuaternion()
  ],
  tmpTrans = [
    new Ammo.btTransform()
  ];

module.exports = {
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
          tmpVec[0].setX(child.localTransform.position.x / this.scaleFactor);
          tmpVec[0].setY(child.localTransform.position.y / this.scaleFactor);
          tmpVec[0].setZ(child.localTransform.position.z / this.scaleFactor);
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

    for (var i = 0; i < shape.vertices.length; i+=3) {
      tmpVec[0].setX(shape.vertices[i+0] / this.scaleFactor);
      tmpVec[0].setY(shape.vertices[i+1] / this.scaleFactor);
      tmpVec[0].setZ(shape.vertices[i+2] / this.scaleFactor);
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
      tmpVec[0].setX(shape.triangles[i * 9 + 0] / this.scaleFactor);
      tmpVec[0].setY(shape.triangles[i * 9 + 1] / this.scaleFactor);
      tmpVec[0].setZ(shape.triangles[i * 9 + 2] / this.scaleFactor);

      tmpVec[1].setX(shape.triangles[i * 9 + 3] / this.scaleFactor);
      tmpVec[1].setY(shape.triangles[i * 9 + 4] / this.scaleFactor);
      tmpVec[1].setZ(shape.triangles[i * 9 + 5] / this.scaleFactor);

      tmpVec[2].setX(shape.triangles[i * 9 + 6] / this.scaleFactor);
      tmpVec[2].setY(shape.triangles[i * 9 + 7] / this.scaleFactor);
      tmpVec[2].setZ(shape.triangles[i * 9 + 8] / this.scaleFactor);

      mesh.addTriangle(tmpVec[0], tmpVec[1], tmpVec[2], false);
    }

    return new Ammo[className](mesh, true, true);
  },

  _createShape: function(shape) {
    this.shapeCache = this.shapeCache || {};

    var shapeJSON = JSON.stringify(shape);

    if (this.shapeCache[shapeJSON]) {
      return this.shapeCache[shapeJSON];
    }

    var colShape;
    switch(shape.shape) {
    case 'box':
      tmpVec[0].setX(shape.halfExtents.x / this.scaleFactor);
      tmpVec[0].setY(shape.halfExtents.y / this.scaleFactor);
      tmpVec[0].setZ(shape.halfExtents.z / this.scaleFactor);
      colShape = new Ammo.btBoxShape(tmpVec[0]);
      break;
    case 'sphere':
      colShape = new Ammo.btSphereShape(shape.radius / this.scaleFactor);
      break;
    case 'staticplane':
      tmpVec[0].setX(shape.normal.x);
      tmpVec[0].setY(shape.normal.y);
      tmpVec[0].setZ(shape.normal.z);
      colShape = new Ammo.btStaticPlaneShape(tmpVec[0], shape.distance);
      break;
    case 'cylinder':
      tmpVec[0].setX(shape.width / this.scaleFactor);
      tmpVec[0].setY(shape.height / this.scaleFactor);
      tmpVec[0].setZ(shape.depth);
      colShape = new Ammo.btCylinderShape(tmpVec[0]);
      break;
    case 'capsule':
      colShape = new Ammo.btCapsuleShape(shape.radius / this.scaleFactor,
          shape.height / this.scaleFactor);
      break;
    case 'cone':
      colShape = new Ammo.btConeShape(shape.radius / this.scaleFactor,
          shape.height / this.scaleFactor);
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

    this.shapeCache[shapeJSON] = colShape;

    return colShape;
  }
};
