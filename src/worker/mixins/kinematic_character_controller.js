var CollisionFlags = require('../constants/collision_flags'),
    CollisionFilterGroups = require('../constants/collision_filter_groups'),
    KinematicCharacterController = require('../objects/kinematic_character_controller');

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
  KinematicCharacterController_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var colShape,
        startTransform = tmpTrans[0],
        origin = tmpVec[0],
        rotation = tmpQuaternion[0],
        ghost,
        controller;

    startTransform.setIdentity();

    colShape = this._createShape(descriptor.shape);

    if (!colShape) {
      throw('Invalid collision shape!');
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

    ghost = new Ammo.btPairCachingGhostObject();
    ghost.setWorldTransform(startTransform);

    ghost.setCollisionShape(colShape);
    ghost.setCollisionFlags(CollisionFlags.CF_CHARACTER_OBJECT);

    controller = new Ammo.btKinematicCharacterController (ghost, colShape, descriptor.stepHeight);

    this.dynamicsWorld.addCollisionObject(ghost, CollisionFilterGroups.CharacterFilter,
      CollisionFilterGroups.StaticFilter | CollisionFilterGroups.DefaultFilter);

    this.dynamicsWorld.addAction(controller);

    var id = this.ids.pop();

    var obj = new KinematicCharacterController(id, controller, this);

    this.objects[id] = obj;

    var o = Ammo.castObject(ghost, Ammo.btCollisionObject);

    controller.userData = o.userData = {
      type: 'btKinematicCharacterController',
      id: id
    };

    if (typeof fn === 'function') {
      fn(id);
    }
  },

  KinematicCharacterController_setWalkDirection: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      tmpVec[0].setX(descriptor.direction.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.direction.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.direction.z / this.scaleFactor);

      controller.ammoData.setWalkDirection(tmpVec[0]);
    }
  },

  KinematicCharacterController_jump: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.jump();
    }
  },

  KinematicCharacterController_setJumpSpeed: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setJumpSpeed(descriptor.jumpSpeed / this.scaleFactor);
    }
  },

  KinematicCharacterController_setFallSpeed: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setFallSpeed(descriptor.fallSpeed / this.scaleFactor);
    }
  },

  KinematicCharacterController_setMaxJumpHeight: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setMaxJumpHeight(descriptor.maxJumpHeight / this.scaleFactor);
    }
  },

  KinematicCharacterController_setGravity: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setGravity(descriptor.gravity / this.scaleFactor);
    }
  },

  KinematicCharacterController_setUpAxis: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setUpAxis(descriptor.upAxis);
    }
  },

  KinematicCharacterController_setVelocityForTimeInterval: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      tmpVec[0].setX(descriptor.velocity.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.velocity.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.velocity.z / this.scaleFactor);

      controller.ammoData.setVelocityForTimeInterval(tmpVec[0], descriptor.interval);
    }
  },

  KinematicCharacterController_setUseGhostSweepTest: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setUseGhostSweepTest(descriptor.useGhostSweepTest);
    }
  },

  KinematicCharacterController_setMaxSlope: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      controller.ammoData.setMaxSlope(descriptor.slopeRadians);
    }
  },

  KinematicCharacterController_warp: function(descriptor) {
    var controller = this.objects[descriptor.controllerId];

    if (controller) {
      tmpVec[0].setX(descriptor.origin.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.origin.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.origin.z / this.scaleFactor);

      controller.ammoData.warp(tmpVec[0]);
    }
  }
};
