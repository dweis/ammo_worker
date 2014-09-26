var _ = require('underscore');

function AmmoGeneric6DofConstraint(proxy, constraintId) {
  this.proxy = proxy;
  this.constraintId = constraintId;
}

AmmoGeneric6DofConstraint.prototype.setAngularOnly = function(angularOnly) {
  return this.proxy.execute('Generic6DofConstraint_setAngularOnly', {
    constraintId: this.constraintId,
    angularOnly: angularOnly
  });
};

AmmoGeneric6DofConstraint.prototype.setDamping = function(damping) {
  return this.proxy.execute('Generic6DofConstraint_setDamping', {
    constraintId: this.constraintId,
    damping: damping
  });
};

AmmoGeneric6DofConstraint.prototype.enableMotor = function(isEnabled) {
  return this.proxy.execute('Generic6DofConstraint_enableMotor', {
    constraintId: this.constraintId,
    isEnabled: isEnabled
  });
};

AmmoGeneric6DofConstraint.prototype.setMaxMotorImpulse = function(maxMotorImpulse) {
  return this.proxy.execute('Generic6DofConstraint_setMaxMotorImpulse', {
    constraintId: this.constraintId,
    maxMotorImpulse: maxMotorImpulse
  });
};

AmmoGeneric6DofConstraint.prototype.setMaxMotorImpulseNormalized = function(maxMotorImpulse) {
  return this.proxy.execute('Generic6DofConstraint_setMaxMotorImpulseNormalized', {
    constraintId: this.constraintId,
    maxMotorImpulse: maxMotorImpulse
  });
};

AmmoGeneric6DofConstraint.prototype.setMotorTarget = function(motorTarget) {
  return this.proxy.execute('Generic6DofConstraint_setMotorTarget', {
    constraintId: this.constraintId,
    motorTarget: motorTarget
  });
};

AmmoGeneric6DofConstraint.prototype.setMotorTargetInConstraintSpace = function(motorTarget) {
  return this.proxy.execute('Generic6DofConstraint_setMotorTargetInConstraintSpace', {
    constraintId: this.constraintId,
    motorTarget: motorTarget
  });
};

AmmoGeneric6DofConstraint.prototype.setLimit = function(swingSpan1, swingSpan2, twistSpan, 
    softness, biasFactor, relaxationFactor) {
  softness = (_.isNumber(softness)) ? softness : 1.0;
  biasFactor = (_.isNumber(biasFactor)) ? biasFactor : 0.3;
  relaxationFactor = (_.isNumber(relaxationFactor)) ? relaxationFactor : 1.0;

  return this.proxy.execute('Generic6DofConstraint_setLimit', {
    constraintId: this.constraintId,
    swingSpan1: swingSpan1,
    swingSpan2: swingSpan2,
    twistSpan: twistSpan,
    softness: softness,
    biasFactor: biasFactor,
    relaxationFactor: relaxationFactor
  });
};


module.exports = AmmoGeneric6DofConstraint;
