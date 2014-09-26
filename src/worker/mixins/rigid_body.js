var CollisionFlags = require('../constants/collision_flags'),
    ActivationStates = require('../constants/activation_states'),
    RigidBody = require('../objects/rigid_body');

var tmpVec = [
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
  RigidBody_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var colShape,
        startTransform = tmpTrans[0],
        isDynamic = (descriptor.mass !== 0),
        localInertia = tmpVec[0],
        origin = tmpVec[1],
        rotation = tmpQuaternion[0],
        myMotionState,
        rbInfo,
        body;

    startTransform.setIdentity();
    ////localInertia.setZero();
    localInertia.setX(0);
    localInertia.setY(0);
    localInertia.setZ(0);

    colShape = this._createShape(descriptor.shape);

    if (!colShape) {
      throw('Invalid collision shape!');
    }

    if (isDynamic) {
      colShape.calculateLocalInertia(descriptor.mass,localInertia);
    }

    origin.setX(descriptor.position.x / this.scaleFactor);
    origin.setY(descriptor.position.y / this.scaleFactor);
    origin.setZ(descriptor.position.z / this.scaleFactor);

    rotation.setX(descriptor.quaternion.x);
    rotation.setY(descriptor.quaternion.y);
    rotation.setZ(descriptor.quaternion.z);
    rotation.setW(descriptor.quaternion.w);

    startTransform.setOrigin(origin);
    startTransform.setRotation(rotation);

    myMotionState = new Ammo.btDefaultMotionState(startTransform);
    rbInfo = new Ammo.btRigidBodyConstructionInfo(descriptor.mass, myMotionState, colShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);

    var id = this.ids.pop();

    var obj = new RigidBody(id, body, this);

    this.objects[id] = obj;

    var o = Ammo.castObject(body, Ammo.btCollisionObject);

    body.userData = o.userData = {
      type: 'btRigidBody',
      id: id
    };

    if (typeof fn === 'function') {
      fn(id);
    }
  },

  RigidBody_setType: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body && body.ammoData) {
      switch (descriptor.type) {
      case 'static':
        body.ammoData.setCollisionFlags(CollisionFlags.CF_STATIC_OBJECT);
        body.ammoData.setActivationState(ActivationStates.DISABLE_SIMULATION);
        break;
      case 'kinematic':
        body.ammoData.setCollisionFlags(CollisionFlags.CF_KINEMATIC_OBJECT);
        body.ammoData.setActivationState(ActivationStates.DISABLE_DEACTIVATION);
        break;
      default:
        console.warn('unknown body type: ' + descriptor.type + ', defaulting to dynamic');
        body.ammoData.setCollisionFlags(0);
        break;
      case 'dynamic':
        body.ammoData.setCollisionFlags(0);
        break;
      }
    }
  },

  RigidBody_setWorldTransform: function(descriptor) {
    var body = this.objects[descriptor.bodyId],
        position,
        rotation;

    if (body.ammoData) {
      tmpTrans[0].setIdentity();
      body.ammoData.getMotionState().getWorldTransform(tmpTrans[0]);
      position = tmpTrans[0].getOrigin();
      rotation = tmpTrans[0].getRotation();

      if (descriptor.position) {
        position.setX(descriptor.position.x / this.scaleFactor);
        position.setY(descriptor.position.y / this.scaleFactor);
        position.setZ(descriptor.position.z / this.scaleFactor);
      }

      if (descriptor.rotation) {
        rotation.setX(descriptor.rotation.x);
        rotation.setY(descriptor.rotation.y);
        rotation.setZ(descriptor.rotation.z);
        rotation.setW(descriptor.rotation.w);
      }

      if (body.ammoData.isKinematicObject()) {
        body.ammoData.getMotionState().setWorldTransform(tmpTrans[0]);
      } else {
        body.ammoData.setWorldTransform(tmpTrans[0]);
      }
    }
  },

  RigidBody_clearForces: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      body.ammoData.clearForces();
      body.ammoData.activate();
    }
  },

  RigidBody_applyForce: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.force.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.force.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.force.z / this.scaleFactor);
      tmpVec[1].setX(descriptor.relativePosition.x / this.scaleFactor);
      tmpVec[1].setY(descriptor.relativePosition.y / this.scaleFactor);
      tmpVec[1].setZ(descriptor.relativePosition.z / this.scaleFactor);

      body.ammoData.applyForce(tmpVec[0], tmpVec[1]);
      body.ammoData.activate();
    }
  },

  RigidBody_applyCentralForce: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.force.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.force.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.force.z / this.scaleFactor);

      body.ammoData.applyCentralForce(tmpVec[0]);
      body.ammoData.activate();
    }
  },

  RigidBody_applyImpulse: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.impulse.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.impulse.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.impulse.z / this.scaleFactor);
      tmpVec[1].setX(descriptor.relativePosition.x / this.scaleFactor);
      tmpVec[1].setY(descriptor.relativePosition.y / this.scaleFactor);
      tmpVec[1].setZ(descriptor.relativePosition.z / this.scaleFactor);

      body.ammoData.applyImpulse(tmpVec[0], tmpVec[1]);
      body.ammoData.activate();
    }
  },

  RigidBody_applyCentralImpulse: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.force.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.force.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.force.z / this.scaleFactor);

      body.ammoData.applyCentralImpulse(tmpVec[0]);
      body.ammoData.activate();
    }
  },

  RigidBody_applyTorque: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.torque.x / (this.scaleFactor * this.scaleFactor));
      tmpVec[0].setY(descriptor.torque.y / (this.scaleFactor * this.scaleFactor));
      tmpVec[0].setZ(descriptor.torque.z / (this.scaleFactor * this.scaleFactor));

      body.ammoData.applyTorque(tmpVec[0]);
      body.ammoData.activate();
    }
  },

  RigidBody_setRestitution: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body && body.ammoData) {
      body.ammoData.setRestitution(descriptor.restitution);
    }
  },

  RigidBody_setFriction: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body && body.ammoData) {
      body.ammoData.setFriction(descriptor.friction);
    }
  },

  RigidBody_setDamping: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      body.ammoData.setDamping(descriptor.linearDamping, descriptor.angularDamping);
    }
  },

  RigidBody_getLinearVelocity: function(descriptor, fn) {
    var body = this.objects[descriptor.bodyId],
        lv;

    if (body.ammoData) {
      lv = body.ammoData.getLinearVelocity();

      fn({
        x: lv.x() * this.scaleFactor,
        y: lv.y() * this.scaleFactor,
        z: lv.z() * this.scaleFactor
      });
    }
  },

  RigidBody_setLinearFactor: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.linearFactor.x);
      tmpVec[0].setY(descriptor.linearFactor.y);
      tmpVec[0].setZ(descriptor.linearFactor.z);
      body.ammoData.setLinearFactor(tmpVec[0]);
    }
  },

  RigidBody_getAngularVelocity: function(descriptor, fn) {
    var body = this.objects[descriptor.bodyId],
        av;

    if (body.ammoData) {
      av = body.ammoData.getAngularVelocity();

      fn({
        x: av.x(),
        y: av.y(),
        z: av.z()
      });
    }
  },

  RigidBody_setAngularFactor: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.angularFactor.x);
      tmpVec[0].setY(descriptor.angularFactor.y);
      tmpVec[0].setZ(descriptor.angularFactor.z);
      body.ammoData.setAngularFactor(tmpVec[0]);
    }
  },

  RigidBody_setLinearVelocity: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.linearVelocity.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.linearVelocity.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.linearVelocity.z / this.scaleFactor);
      body.ammoData.setLinearVelocity(tmpVec[0]);
    }
  },

  RigidBody_setAngularVelocity: function(descriptor) {
    var body = this.objects[descriptor.bodyId];

    if (body.ammoData) {
      tmpVec[0].setX(descriptor.angularVelocity.x);
      tmpVec[0].setY(descriptor.angularVelocity.y);
      tmpVec[0].setZ(descriptor.angularVelocity.z);
      body.ammoData.setAngularVelocity(tmpVec[0]);
    }
  },

  RigidBody_destroy: function(descriptor) {
    var id = descriptor && descriptor.bodyId,
        body = this.objects[id];

    if (body.ammoData) {
      this.objects[id] = undefined;
      this.dynamicsWorld.removeRigidBody(body.ammoData);
      Ammo.destroy(body.ammoData);
      this.trigger('destroy', id);
      this.ids.push(id);
    }
  }
};
