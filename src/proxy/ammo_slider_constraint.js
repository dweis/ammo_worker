function AmmoSliderConstraint(proxy, constraintId) {
  this.proxy = proxy;
  this.constraintId = constraintId;
} 

AmmoSliderConstraint.prototype.setLowerLinLimit = function(limit) {
  return this.proxy.execute('SliderConstraint_setLowerLinLimit', {
    constraintId: this.constraintId,
    limit: limit
  });
};

AmmoSliderConstraint.prototype.setUpperLinLimit = function(limit) {
  return this.proxy.execute('SliderConstraint_setUpperLinLimit', {
    constraintId: this.constraintId,
    limit: limit
  });
};

AmmoSliderConstraint.prototype.setLowerAngLimit = function(limit) {
  return this.proxy.execute('SliderConstraint_setLowerAngLimit', {
    constraintId: this.constraintId,
    limit: limit
  });
};

AmmoSliderConstraint.prototype.setUpperAngLimit = function(limit) {
  return this.proxy.execute('SliderConstraint_setUpperAngLimit', {
    constraintId: this.constraintId,
    limit: limit
  });
};

module.exports = AmmoSliderConstraint;
