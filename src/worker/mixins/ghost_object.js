define([ 'worker/constants/collision_flags', 'worker/objects/ghost_object' ],
    function(CollisionFlags, GhostObject) {
  var tmpVec = [
      new Ammo.btVector3()
    ],
    tmpQuaternion = [
      new Ammo.btVector3()
    ],
    tmpTrans = [
      new Ammo.btTransform()
    ];

  return {
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

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

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

      var obj = new GhostObject(id, ghostObject);

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
});
