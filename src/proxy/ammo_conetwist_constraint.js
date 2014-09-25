var _ = require('underscore');

function AmmoConeTwistConstraint(proxy, constraintId) {
  this.proxy = proxy;
  this.constraintId = constraintId;
} 

AmmoConeTwistConstraint.prototype.setAngularOnly = function(angularOnly) {
  return this.proxy.execute('ConeTwistConstraint_setAngularOnly', {
    constraintId: this.constraintId,
    angularOnly: angularOnly
  });
};

AmmoConeTwistConstraint.prototype.setDamping = function(damping) {
  return this.proxy.execute('ConeTwistConstraint_setDamping', {
    constraintId: this.constraintId,
    damping: damping
  });
};

AmmoConeTwistConstraint.prototype.enableMotor = function(isEnabled) {
  return this.proxy.execute('ConeTwistConstraint_enableMotor', {
    constraintId: this.constraintId,
    isEnabled: isEnabled
  });
};

AmmoConeTwistConstraint.prototype.setMaxMotorImpulse = function(maxMotorImpulse) {
  return this.proxy.execute('ConeTwistConstraint_setMaxMotorImpulse', {
    constraintId: this.constraintId,
    maxMotorImpulse: maxMotorImpulse
  });
};

AmmoConeTwistConstraint.prototype.setMaxMotorImpulseNormalized = function(maxMotorImpulse) {
  return this.proxy.execute('ConeTwistConstraint_setMaxMotorImpulseNormalized', {
    constraintId: this.constraintId,
    maxMotorImpulse: maxMotorImpulse
  });
};

AmmoConeTwistConstraint.prototype.setMotorTarget = function(motorTarget) {
  return this.proxy.execute('ConeTwistConstraint_setMotorTarget', {
    constraintId: this.constraintId,
    motorTarget: motorTarget
  });
};

AmmoConeTwistConstraint.prototype.setMotorTargetInConstraintSpace = function(motorTarget) {
  return this.proxy.execute('ConeTwistConstraint_setMotorTargetInConstraintSpace', {
    constraintId: this.constraintId,
    motorTarget: motorTarget
  });
};

AmmoConeTwistConstraint.prototype.setLimit = function(swingSpan1, swingSpan2, twistSpan, 
    softness, biasFactor, relaxationFactor) {
  softness = (_.isNumber(softness)) ? softness : 1.0;
  biasFactor = (_.isNumber(biasFactor)) ? biasFactor : 0.3;
  relaxationFactor = (_.isNumber(relaxationFactor)) ? relaxationFactor : 1.0;

  return this.proxy.execute('ConeTwistConstraint_setLimit', {
    constraintId: this.constraintId,
    swingSpan1: swingSpan1,
    swingSpan2: swingSpan2,
    twistSpan: twistSpan,
    softness: softness,
    biasFactor: biasFactor,
    relaxationFactor: relaxationFactor
  });
};

module.exports = AmmoConeTwistConstraint;
