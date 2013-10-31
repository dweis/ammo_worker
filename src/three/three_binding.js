define([], function() {
  var tmpQuaternion = new THREE.Quaternion(),
      tmpVector3 = new THREE.Vector3();

  function THREEBinding(proxy, object, offset) {
    this.proxy = proxy;
    this.object = object;
    this.offset = offset;

    object.matrixAutoUpdate = false;
    object.updateMatrixWorld();
    this.originalScale = new THREE.Vector3();
    this.originalScale.getScaleFromMatrix(object.matrixWorld);
  }

  THREEBinding.prototype.update = function() {
    if (this.object && this.proxy && this.proxy.data) {
      tmpVector3.x = this.proxy.data[this.offset + 0];
      tmpVector3.y = this.proxy.data[this.offset + 1];
      tmpVector3.z = this.proxy.data[this.offset + 2];
      tmpQuaternion.x = this.proxy.data[this.offset + 3];
      tmpQuaternion.y = this.proxy.data[this.offset + 4];
      tmpQuaternion.z = this.proxy.data[this.offset + 5];
      tmpQuaternion.w = this.proxy.data[this.offset + 6];

      this.object.matrixWorld.makeRotationFromQuaternion(tmpQuaternion);
      this.object.matrixWorld.scale(this.originalScale);
      this.object.matrixWorld.setPosition(tmpVector3);
    }
  };

  return THREEBinding;
});
