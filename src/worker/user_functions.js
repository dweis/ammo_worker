function UserFunctions(worker) {
  this.worker = worker;

  this.preStepFunctions = [];
  this.postStepFunctions = [];
}

UserFunctions.prototype = {};

UserFunctions.prototype.runOnce = function(fn) {
  fn.apply(this);
};

UserFunctions.prototype.runPreStep = function(fn) {
  var id = this.preStepFunctions.push(fn);
  return id;
};

UserFunctions.prototype.runPostStep = function(fn) {
  var id = this.postStepFunctions.push(fn);
  return id;
};

UserFunctions.prototype.preStep = function(delta) {
  for (var i = 0; i < this.preStepFunctions.length; i++) {
    this.preStepFunctions[i].call(this, delta);
  }
};

UserFunctions.prototype.postStep = function(delta) {
  for (var i = 0; i < this.postStepFunctions.length; i++) {
    this.postStepFunctions[i].call(this, delta);
  }
};

module.exports = UserFunctions;
