function THREEBinding(proxy, object, offset) {
  this.proxy = proxy;
  this.object = object;
  this.offset = offset * 7;

  this.position = new THREE.Vector3();
  this.quaternion = new THREE.Quaternion();

  object.matrixAutoUpdate = false;
  object.updateMatrixWorld();
  this.originalScale = new THREE.Vector3();
  this.originalScale.setFromMatrixScale(object.matrixWorld);
}

THREEBinding.prototype.update = function() {
  if (this.object && this.proxy && this.proxy.data) {
    this.position.x = this.proxy.data[this.offset + 0];
    this.position.y = this.proxy.data[this.offset + 1];
    this.position.z = this.proxy.data[this.offset + 2];
    this.quaternion.x = this.proxy.data[this.offset + 3];
    this.quaternion.y = this.proxy.data[this.offset + 4];
    this.quaternion.z = this.proxy.data[this.offset + 5];
    this.quaternion.w = this.proxy.data[this.offset + 6];

    this.object.matrixWorld.makeRotationFromQuaternion(this.quaternion);
    this.object.matrixWorld.scale(this.originalScale);
    this.object.matrixWorld.setPosition(this.position);
  }
};

THREEBinding.prototype.destroy = function() {
  this.object = undefined;
  this.offset = undefined;
};

module.exports = THREEBinding;
