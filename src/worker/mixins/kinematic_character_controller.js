define([ 'worker/constants/collision_flags', 'worker/constants/collision_filter_groups',
      'worker/objects/kinematic_character_controller' ],
    function(CollisionFlags, CollisionFilterGroups, KinematicCharacterController) {
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

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

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

      var obj = new KinematicCharacterController(id, controller);

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
        tmpVec[0].setX(descriptor.direction.x);
        tmpVec[0].setY(descriptor.direction.y);
        tmpVec[0].setZ(descriptor.direction.z);

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
        controller.ammoData.setJumpSpeed(descriptor.jumpSpeed);
      }
    },

    KinematicCharacterController_setFallSpeed: function(descriptor) {
      var controller = this.objects[descriptor.controllerId];

      if (controller) {
        controller.ammoData.setFallSpeed(descriptor.fallSpeed);
      }
    },

    KinematicCharacterController_setMaxJumpHeight: function(descriptor) {
      var controller = this.objects[descriptor.controllerId];

      if (controller) {
        controller.ammoData.setMaxJumpHeight(descriptor.maxJumpHeight);
      }
    },

    KinematicCharacterController_setGravity: function(descriptor) {
      var controller = this.objects[descriptor.controllerId];

      if (controller) {
        controller.ammoData.setGravity(descriptor.gravity);
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
        tmpVec[0].setX(descriptor.velocity.x);
        tmpVec[0].setY(descriptor.velocity.y);
        tmpVec[0].setZ(descriptor.velocity.z);

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
        tmpVec[0].setX(descriptor.origin.x);
        tmpVec[0].setY(descriptor.origin.y);
        tmpVec[0].setZ(descriptor.origin.z);

        controller.ammoData.warp(tmpVec[0]);
      }
    }
  };
});
