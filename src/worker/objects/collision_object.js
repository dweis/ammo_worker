/* jshint unused:vars */
define([ 'worker/objects/ammo_object' ], function(AmmoObject) {
  function CollisionObject(id, ammoData) {
    AmmoObject.apply(this, arguments);
    this.type = 'btCollisionObject';
  }

  CollisionObject.prototype = new AmmoObject();
  
  return CollisionObject;
});
