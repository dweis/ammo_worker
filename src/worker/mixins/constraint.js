var ConeTwistConstraint = require('../objects/conetwist_constraint'),
    Point2PointConstraint = require('../objects/point2point_constraint'),
    DOF6Constraint = require('../objects/dof6_constraint'),
    HingeConstraint = require('../objects/hinge_constraint'),
    SliderConstraint = require('../objects/slider_constraint');

var tmpVec = [
  new Ammo.btVector3(),
  new Ammo.btVector3(),
  new Ammo.btVector3(),
  new Ammo.btVector3()
];

var tmpQuaternion = [
  new Ammo.btQuaternion(),
  new Ammo.btQuaternion()
];

module.exports = {
  Constraint_destroy: function(descriptor) {
    var id = descriptor && descriptor.constraintId,
        constraint = this.objects[id];

    if (constraint) {
      this.dynamicsWorld.removeConstraint(constraint.ammoData);
      Ammo.destroy(constraint.ammoData);
      this.objects[id] = undefined;
      this.trigger('destroy', id);
      this.ids.push(id);
    }
  },

  Point2PointConstraint_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var rigidBodyA = this.objects[descriptor.rigidBodyIdA],
        rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
          this.objects[descriptor.rigidBodyIdB],
        constraint,
        id;

    if (rigidBodyA) {
      tmpVec[0].setX(descriptor.pivotA.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.pivotA.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.pivotA.z / this.scaleFactor);

      if (rigidBodyB) {
        rigidBodyB = this.objects[descriptor.rigidBodyIdB];
        tmpVec[1].setX(descriptor.pivotB.x / this.scaleFactor);
        tmpVec[1].setY(descriptor.pivotB.y / this.scaleFactor);
        tmpVec[1].setZ(descriptor.pivotB.z / this.scaleFactor);
        constraint = new Ammo.btPoint2PointConstraint(rigidBodyA.ammoData, rigidBodyB.ammoData, tmpVec[0], tmpVec[1]);
      } else {
        constraint = new Ammo.btPoint2PointConstraint(rigidBodyA.ammoData, tmpVec[0]);
      }

      id = this.ids.pop();

      var obj = new Point2PointConstraint(id, constraint);

      this.objects[id] = obj;

      this.dynamicsWorld.addConstraint(constraint);
      constraint.enableFeedback();

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },

  SliderConstraint_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var rigidBodyA = this.objects[descriptor.rigidBodyIdA],
        rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
          this.objects[descriptor.rigidBodyIdB],
        constraint,
        id;

    if (rigidBodyA) {
      var transformA = new Ammo.btTransform();

      tmpVec[0].setX(descriptor.frameInA.position.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.frameInA.position.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.frameInA.position.z / this.scaleFactor);

      tmpQuaternion[0].setX(descriptor.frameInA.rotation.x);
      tmpQuaternion[0].setY(descriptor.frameInA.rotation.y);
      tmpQuaternion[0].setZ(descriptor.frameInA.rotation.z);
      tmpQuaternion[0].setW(descriptor.frameInA.rotation.w);

      transformA.setOrigin(tmpVec[0]);
      transformA.setRotation(tmpQuaternion[0]);

      if (rigidBodyB) {
        var transformB = new Ammo.btTransform();

        tmpVec[1].setX(descriptor.frameInB.position.x / this.scaleFactor);
        tmpVec[1].setY(descriptor.frameInB.position.y / this.scaleFactor);
        tmpVec[1].setZ(descriptor.frameInB.position.z / this.scaleFactor);

        tmpQuaternion[1].setX(descriptor.frameInB.rotation.x);
        tmpQuaternion[1].setY(descriptor.frameInB.rotation.y);
        tmpQuaternion[1].setZ(descriptor.frameInB.rotation.z);
        tmpQuaternion[1].setW(descriptor.frameInB.rotation.w);

        transformB.setOrigin(tmpVec[1]);
        transformB.setRotation(tmpQuaternion[1]);

        constraint = new Ammo.btSliderConstraint(rigidBodyA.ammoData, rigidBodyB.ammoData,
          transformA, transformB, true);
      } else {
        constraint = new Ammo.btSliderConstraint(rigidBodyA.ammoData, transformA);
      }

      id = this.ids.pop();

      var obj = new SliderConstraint(id, constraint);

      this.objects[id] = obj;

      this.dynamicsWorld.addConstraint(constraint);
      constraint.enableFeedback();

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },

  SliderConstraint_setLowerLinLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setLowerLinLimit(descriptor.limit);
    }
  },

  SliderConstraint_setUpperLinLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setUpperLinLimit(descriptor.limit);
    }
  },

  SliderConstraint_setLowerAngLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setLowerAngLimit(descriptor.limit);
    }
  },

  SliderConstraint_setUpperAngLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setUpperAngLimit(descriptor.limit);
    }
  },

  Generic6DofConstraint_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var rigidBodyA = this.objects[descriptor.rigidBodyIdA],
        rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
          this.objects[descriptor.rigidBodyIdB],
        constraint,
        id;

    if (rigidBodyA) {
      var transformA = new Ammo.btTransform();

      tmpVec[0].setX(descriptor.rbAFrame.position.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.rbAFrame.position.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.rbAFrame.position.z / this.scaleFactor);

      tmpQuaternion[0].setX(descriptor.rbAFrame.rotation.x);
      tmpQuaternion[0].setY(descriptor.rbAFrame.rotation.y);
      tmpQuaternion[0].setZ(descriptor.rbAFrame.rotation.z);
      tmpQuaternion[0].setW(descriptor.rbAFrame.rotation.w);

      transformA.setOrigin(tmpVec[0]);
      transformA.setRotation(tmpQuaternion[0]);

      if (rigidBodyB) {
        var transformB = new Ammo.btTransform();

        tmpVec[1].setX(descriptor.rbBFrame.position.x / this.scaleFactor);
        tmpVec[1].setY(descriptor.rbBFrame.position.y / this.scaleFactor);
        tmpVec[1].setZ(descriptor.rbBFrame.position.z / this.scaleFactor);

        tmpQuaternion[1].setX(descriptor.rbBFrame.rotation.x);
        tmpQuaternion[1].setY(descriptor.rbBFrame.rotation.y);
        tmpQuaternion[1].setZ(descriptor.rbBFrame.rotation.z);
        tmpQuaternion[1].setW(descriptor.rbBFrame.rotation.w);

        transformB.setOrigin(tmpVec[1]);
        transformB.setRotation(tmpQuaternion[1]);

        constraint = new Ammo.btGeneric6DofConstraint(rigidBodyA.ammoData, rigidBodyB.ammoData, transformA, transformB, !!descriptor.useLinearReference);
      } else {
        constraint = new Ammo.btGeneric6DofConstraint(rigidBodyA.ammoData, transformA, !!descriptor.useLinearReference);
      }

      id = this.ids.pop();

      var obj = new DOF6Constraint(id, constraint);
      this.objects[id] = obj;

      this.dynamicsWorld.addConstraint(constraint);
      //constraint.enableFeedback();

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },


  ConeTwistConstraint_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var rigidBodyA = this.objects[descriptor.rigidBodyIdA],
        rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' &&
          this.objects[descriptor.rigidBodyIdB],
        constraint,
        id;

    if (rigidBodyA) {
      var transformA = new Ammo.btTransform();

      tmpVec[0].setX(descriptor.rbAFrame.position.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.rbAFrame.position.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.rbAFrame.position.z / this.scaleFactor);

      tmpQuaternion[0].setX(descriptor.rbAFrame.rotation.x);
      tmpQuaternion[0].setY(descriptor.rbAFrame.rotation.y);
      tmpQuaternion[0].setZ(descriptor.rbAFrame.rotation.z);
      tmpQuaternion[0].setW(descriptor.rbAFrame.rotation.w);

      transformA.setOrigin(tmpVec[0]);
      transformA.setRotation(tmpQuaternion[0]);

      if (rigidBodyB) {
        var transformB = new Ammo.btTransform();

        tmpVec[1].setX(descriptor.rbBFrame.position.x / this.scaleFactor);
        tmpVec[1].setY(descriptor.rbBFrame.position.y / this.scaleFactor);
        tmpVec[1].setZ(descriptor.rbBFrame.position.z / this.scaleFactor);

        tmpQuaternion[1].setX(descriptor.rbBFrame.rotation.x);
        tmpQuaternion[1].setY(descriptor.rbBFrame.rotation.y);
        tmpQuaternion[1].setZ(descriptor.rbBFrame.rotation.z);
        tmpQuaternion[1].setW(descriptor.rbBFrame.rotation.w);

        transformB.setOrigin(tmpVec[1]);
        transformB.setRotation(tmpQuaternion[1]);

        constraint = new Ammo.btConeTwistConstraint(rigidBodyA.ammoData, rigidBodyB.ammoData, transformA, transformB);
      } else {
        constraint = new Ammo.btConeTwistConstraint(rigidBodyA.ammoData, transformA);
      }

      id = this.ids.pop();

      var obj = new ConeTwistConstraint(id, constraint);

      this.objects[id] = obj;

      this.dynamicsWorld.addConstraint(constraint);
      //constraint.enableFeedback();

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },

  ConeTwistConstraint_setAngularOnly: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setAngularOnly(descriptor.angularOnly);
    }
  },

  ConeTwistConstraint_setDamping: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setDamping(descriptor.damping);
    }
  },

  ConeTwistConstraint_enableMotor: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.enableMotor(descriptor.isEnabled);
    }
  },

  ConeTwistConstraint_setMaxMotorImpulse: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setMaxMotorImpulse(descriptor.maxMotorImpulse);
    }
  },

  ConeTwistConstraint_setMaxMotorImpulseNormalized: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setMaxMotorImpulseNormalized(descriptor.maxMotorImpulse);
    }
  },

  ConeTwistConstraint_setMotorTarget: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setMotorTarget(descriptor.motorTarget);
    }
  },

  ConeTwistConstraint_setMotorTargetInConstraintSpace: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setMotorTargetInConstraintSpace(descriptor.motorTarget);
    }
  },

  ConeTwistConstraint_setLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setLimit(descriptor.swingSpan1, descriptor.swingSpan2,
          descriptor.twistSpan, descriptor.softness, descriptor.biasFactor,
          descriptor.relaxationFactor);
    }
  },

  HingeConstraint_create: function(descriptor, fn) {
    if (!this.ids.length) {
      return console.error('No unused ids!');
    }

    var rigidBodyA = this.objects[descriptor.rigidBodyIdA],
        rigidBodyB,
        constraint,
        id;

    if (rigidBodyA) {
      tmpVec[0].setX(descriptor.pivotA.x / this.scaleFactor);
      tmpVec[0].setY(descriptor.pivotA.y / this.scaleFactor);
      tmpVec[0].setZ(descriptor.pivotA.z / this.scaleFactor);
      tmpVec[1].setX(descriptor.axisA.x);
      tmpVec[1].setX(descriptor.axisA.y);
      tmpVec[1].setX(descriptor.axisA.z);

      if (descriptor.rigidBodyIdB) {
        rigidBodyB = this.objects[descriptor.rigidBodyIdB];
        tmpVec[2].setX(descriptor.pivotB.x / this.scaleFactor);
        tmpVec[2].setY(descriptor.pivotB.y / this.scaleFactor);
        tmpVec[2].setZ(descriptor.pivotB.z / this.scaleFactor);
        tmpVec[3].setX(descriptor.axisB.x);
        tmpVec[3].setY(descriptor.axisB.y);
        tmpVec[3].setZ(descriptor.axisB.z);
        constraint = new Ammo.btHingeConstraint(rigidBodyA.ammoData, rigidBodyB.ammoData,
            tmpVec[0], tmpVec[2], tmpVec[1], tmpVec[3]);
      } else {
        constraint = new Ammo.btHingeConstraint(rigidBodyA, tmpVec[0], tmpVec[1]);
      }

      id = this.ids.pop();
      var obj = new HingeConstraint(id, constraint);
      this.objects[id] = obj;

      this.dynamicsWorld.addConstraint(constraint);
      constraint.enableFeedback();

      if (typeof fn === 'function') {
        fn(id);
      }
    }
  },

  HingeConstraint_setLimit: function(descriptor) {
    var constraint = this.objects[descriptor.constraintId];

    if (constraint) {
      constraint.ammoData.setLimit(descriptor.low, descriptor.high, descriptor.softness,
            descriptor.biasFactor, descriptor.relaxationFactor);
    }
  }
};
