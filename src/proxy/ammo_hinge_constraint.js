function AmmoHingeConstraint(proxy, constraintId) {
  this.proxy = proxy;
  this.constraintId = constraintId;
} 

AmmoHingeConstraint.prototype.setLimit = function(low, high, softness, biasFactor, relaxationFactor) {
  var descriptor = {
    constraintId: this.constraintId,
    low: low,
    high: high,
    softness: softness,
    biasFactor: biasFactor,
    relaxationFactor: relaxationFactor
  };

  return this.proxy.execute('HingeConstraint_setLimit', descriptor);
};

module.exports = AmmoHingeConstraint;
