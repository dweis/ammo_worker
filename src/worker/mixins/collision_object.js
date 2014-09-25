var CollisionObject = require('../objects/collision_object');
var tmpTrans = new Ammo.btTransform(),
    tmpVec = new Ammo.btVector3(),
    tmpQuaternion = new Ammo.btQuaternion();

module.exports = {
  CollisionObject_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var colShape,
        startTransform = tmpTrans,
        origin = tmpVec,
        rotation = tmpQuaternion,
        body;

    startTransform.setIdentity();

    colShape = this._createShape(descriptor.shape);

    if (!colShape) {
      throw('Invalid collision shape!');
    }

    origin.setX(descriptor.position.x);
    origin.setY(descriptor.position.y);
    origin.setZ(descriptor.position.z);

    rotation.setX(descriptor.quaternion.x);
    rotation.setY(descriptor.quaternion.y);
    rotation.setZ(descriptor.quaternion.z);
    rotation.setW(descriptor.quaternion.w);

    startTransform.setOrigin(origin);
    startTransform.setRotation(rotation);

    body = new Ammo.btCollisionObject();

    body.setCollisionShape(colShape);

    var id = this.ids.pop();
    var obj = new CollisionObject(id, body);

    this.objects[id] = obj;

    body.userData = {
      type: 'btCollisionObject',
      id: id
    };

    if (typeof fn === 'function') {
      fn(id);
    }
  },

  CollisionObject_setActivationState: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body && body.ammoData) {
      body.ammoData.setActivationState(descriptor.activationState);
    }
  }
};
