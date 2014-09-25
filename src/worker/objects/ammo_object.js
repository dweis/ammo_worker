/* jshint unused: vars */
function AmmoObject(id, ammoData, worker) {
  this.type = "unknown";
  this.id = id;
  this.ammoData = ammoData;
  this.offset = this.id * 7;
  this.collisions = {};
  this.worker = worker;
}

AmmoObject.prototype = {};

AmmoObject.prototype.update = function(buffer) {
};

module.exports = AmmoObject;
