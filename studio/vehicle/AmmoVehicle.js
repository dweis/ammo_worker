var _ = require('underscore');

function Component() {
}

Component.prototype = new VAPI.VeroldComponent();


Component.prototype.init = function() {
  this.listenTo(this.getObject(), 'ammobody_ready', this.ammoBodyReady);
  this.listenTo(this.getEvents(), 'ammoworld_ready', this.ammoWorldReady);
};

 
Component.prototype.ammoWorldReady = function(ammoWorldComponent) {
  if (!this.ammoWorldComponent) {
    this.ammoWorldComponent = ammoWorldComponent;
  }
  
  console.log(this.wheels);
};

Component.prototype.update = function(delta) {
    var position,
        quaternion,
        update,
        pos;
    
  if (typeof this.vehicleId !== 'undefined') {
    update = this.ammoWorldComponent && 
      this.ammoWorldComponent.data;
  
    if (update) {
      for (var i = 0; i < 4; i++) {
        pos = (1000 * 7) + (this.vehicleId * 8 * 7) + (i * 7);
                   //pos = (this.maxBodies * 7) + (i * this.maxWheelsPerVehicle * 7) + (j * 7);
        
        position = this.wheels[i].getThreeData().position;
        quaternion = this.wheels[i].getThreeData().quaternion;
        
        position.x = update[pos + 0];
        position.y = update[pos + 1];
        position.z = update[pos + 2];
        quaternion.x = update[pos + 3];
        quaternion.y = update[pos + 4];
        quaternion.z = update[pos + 5];
        quaternion.w = update[pos + 6];
      }
    } 
    /*
    this.ammoWorldComponent.worker.applyEngineForce({
      vehicleId: this.vehicleId,
      wheel: 0,
      force: 1000 * delta
    });
    this.ammoWorldComponent.worker.applyEngineForce({
      vehicleId: this.vehicleId,
      wheel: 1,
      force: 1000 * delta
    });
    this.ammoWorldComponent.worker.applyEngineForce({
      vehicleId: this.vehicleId,
      wheel: 2,
      force: 1000 * delta
    });
    this.ammoWorldComponent.worker.applyEngineForce({
      vehicleId: this.vehicleId,
      wheel: 3,
      force: 1000 * delta
    });
    */
  }
}; 

Component.prototype.ammoBodyReady = function(bodyId) {
  return;
  this.bodyId = bodyId;
  
  var wheelDirection = { x: 0, y: -1, z: 0 };
  var wheelAxle = { x: -1, y: 0, z: 0 };
  
  console.log('adding vehicle.....', this.bodyId);
  this.ammoWorldComponent.worker.addVehicle({
    bodyId: this.bodyId, 
    suspensionsStiffness: 5.88, 
    suspensionCompression: 0.83,
    suspensionDamping: 0.88,
    maxSuspensionLevel: 500, 
    frictionSlip: 10.5,
    maxSuspensionForce: 6000 }).then( 
       _.bind(function(id) {
         console.log('vehicle id: ', id);
         this.vehicleId = id;
         
         for ( var i = 0; i < 4; i++ ) {
           console.log('adding wheel ' + i);
           this.ammoWorldComponent.worker.addWheel({
            vehicleId: id,
            connectionPoint: {
              x: i % 2 === 0 ? -0.6 : 0.6,
              y: -0.14,
              z: i < 2 ? 0.4 : -0.4
            },
            wheelDirection: { x: 0, y: -1, z: 0 },
            wheelAxle: { x: -1, y: 0, z: 0 },
            suspensionRestLength: 0.22,
            wheelRadius: 0.48,
            isFrontWheel: i < 2 ? false : true
          }).then(function() {
            console.log('wheel added');
          }.bind(this));
        }
       }, this));
};

return Component;
