var tmpVec = [
  new Ammo.btVector3(),
  new Ammo.btVector3()
];

module.exports = {
  /*
  DynamicsWorld_rayTestAllHits: function(descriptor, fn) {
    tmpVec[0].setX(descriptor.rayFromWorld.x);
    tmpVec[0].setY(descriptor.rayFromWorld.y);
    tmpVec[0].setZ(descriptor.rayFromWorld.z);
    tmpVec[1].setX(descriptor.rayToWorld.x);
    tmpVec[1].setY(descriptor.rayToWorld.y);
    tmpVec[1].setZ(descriptor.rayToWorld.z);

    var callback = new Ammo.AllHitsRayResultCallback(tmpVec[0], tmpVec[1]);

    this.dynamicsWorld.rayTest(tmpVec[0], tmpVec[1], callback);

    if (callback.hasHit()) {
      console.log('hits', callback.m_hitFractions.size());
    } else {
      if (typeof fn === 'function') {
        fn();
      }
    }

    Ammo.destroy(callback);
  },
  */

  DynamicsWorld_rayTestClosest: function(descriptor, fn) {
    tmpVec[0].setX(descriptor.rayFromWorld.x / this.scaleFactor);
    tmpVec[0].setY(descriptor.rayFromWorld.y / this.scaleFactor);
    tmpVec[0].setZ(descriptor.rayFromWorld.z / this.scaleFactor);
    tmpVec[1].setX(descriptor.rayToWorld.x / this.scaleFactor);
    tmpVec[1].setY(descriptor.rayToWorld.y / this.scaleFactor);
    tmpVec[1].setZ(descriptor.rayToWorld.z / this.scaleFactor);

    var callback = new Ammo.ClosestRayResultCallback(tmpVec[0], tmpVec[1]);

    this.dynamicsWorld.rayTest(tmpVec[0], tmpVec[1], callback);

    if (callback.hasHit()) {
      var body = Ammo.castObject(callback.get_m_collisionObject(), Ammo.btCollisionObject);

      if (body.userData.id) {
        if (typeof fn === 'function') {
          fn({
            type: 'btRigidBody',
            bodyId: body.userData.id,
            hitPointWorld: {
              x: callback.get_m_hitPointWorld().x() * this.scaleFactor,
              y: callback.get_m_hitPointWorld().y() * this.scaleFactor,
              z: callback.get_m_hitPointWorld().z() * this.scaleFactor
            },
            hitNormalWorld: {
              x: callback.get_m_hitNormalWorld().x(),
              y: callback.get_m_hitNormalWorld().y(),
              z: callback.get_m_hitNormalWorld().z()
            }
          });
        }
      }
    } else {
      if (typeof fn === 'function') {
        fn();
      }
    }

    Ammo.destroy(callback);
  },

  DynamicsWorld_addRigidBody: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body && body.ammoData) {
      this.dynamicsWorld.addRigidBody(body.ammoData, descriptor.group, descriptor.mask);
    }
  },

  DynamicsWorld_addGhostObject: function(descriptor) {
    var ghost = this.objects[descriptor.ghostId];

    if (ghost && ghost.ammoData) {
      this.dynamicsWorld.addCollisionObject(ghost.ammoData, descriptor.group, descriptor.mask);
    }
  },

  DynamicsWorld_addCollisionObject: function(descriptor) {
    var collisionObject = this.objects[descriptor.collisionObjectId];

    if (collisionObject) {
      this.dynamicsWorld.addCollisionObject(collisionObject.ammoData, descriptor.group, descriptor.mask);
    }
  }
};
