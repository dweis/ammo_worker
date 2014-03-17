/* jshint unused: vars */
define([], function() {
  function AmmoObject(id, ammoData) {
    this.type = "unknown";
    this.id = id;
    this.ammoData = ammoData;
    this.offset = this.id * 7;
    this.collisions = {};
  }

  AmmoObject.prototype = {};

  AmmoObject.prototype.update = function(buffer) {
  };

  return AmmoObject;
});
