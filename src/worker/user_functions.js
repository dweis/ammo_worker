define([], function() {
  function UserFunctions(worker) {
    this.worker = worker;

    this.postUpdateFunctions = [];
  }

  UserFunctions.prototype = {};

  UserFunctions.prototype.runOnce = function(fn) {
    fn.apply(this);
  };

  UserFunctions.prototype.runInPostUpdate = function(fn) {
    var id = this.postUpdateFunctions.push(fn);
    return id;
  };

  UserFunctions.prototype.postUpdate = function(delta) {
    for (var i = 0; i < this.postUpdateFunctions.length; i++) {
      this.postUpdateFunctions[i].call(this, delta);
    }
  };

  return UserFunctions;
});
