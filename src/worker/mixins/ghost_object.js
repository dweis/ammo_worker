var CollisionFlags = require('../constants/collision_flags'),
    GhostObject = require('../objects/ghost_object');

var tmpVec = [
    new Ammo.btVector3()
  ],
  tmpQuaternion = [
    new Ammo.btQuaternion()
  ],
  tmpTrans = [
    new Ammo.btTransform()
  ];

module.exports = {
  GhostObject_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids');
    }

    var colShape = this._createShape(descriptor.shape),
        origin = tmpVec[0],
        rotation = tmpQuaternion[0],
        ghostObject;

    if (!colShape) {
      return console.error('Invalid collision shape!');
    }

    tmpTrans[0].setIdentity();

    origin.setX(descriptor.position.x / this.scaleFactor);
    origin.setY(descriptor.position.y / this.scaleFactor);
    origin.setZ(descriptor.position.z / this.scaleFactor);

    rotation.setX(descriptor.quaternion.x);
    rotation.setY(descriptor.quaternion.y);
    rotation.setZ(descriptor.quaternion.z);
    rotation.setW(descriptor.quaternion.w);

    tmpTrans[0].setOrigin(origin);
    tmpTrans[0].setRotation(rotation);

    ghostObject = new Ammo.btPairCachingGhostObject();
    ghostObject.setWorldTransform(tmpTrans[0]);

    ghostObject.setCollisionShape(colShape);
    ghostObject.setCollisionFlags(CollisionFlags.CF_NO_CONTACT_RESPONSE); // no collision response

    var id = this.ids.pop();

    var o = Ammo.castObject(ghostObject, Ammo.btCollisionObject);

    ghostObject.userData = o.userData = {
      type: 'btGhostObject',
      id: id
    };

    var obj = new GhostObject(id, ghostObject, this);

    this.objects[id] = obj;

    if (typeof fn === 'function') {
      fn(id);
    }
  },

  GhostObject_destroy: function(descriptor) {
    var id = descriptor.ghostId,
        ghost = this.objects[id];

    if (ghost) {
      this.dynamicsWorld.removeCollisionObject(ghost.ammoData);
      Ammo.destroy(ghost.ammoData);
      this.objects[id] = undefined;
      this.trigger('destroy', id);
      this.ids.push(id);
    }
  }
};
