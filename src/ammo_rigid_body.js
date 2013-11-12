var _ = require('underscore');

function AmmoRigidBody() {
  this.ammoWorldComponent = null;
  this.body = null;
}

AmmoRigidBody.prototype = new VAPI.VeroldComponent();

AmmoRigidBody.prototype.init = function() {
  this.getEvents().on('ammoworld_ready', this.ammoWorldReady, this);
  this.getEvents().once('load_hierarchy', this.createCollider, this);
};

AmmoRigidBody.prototype.shutdown = function() {
  this.getEvents().off('ammoworld_ready', this.ammoWorldReady, this);
};

AmmoRigidBody.prototype.objectLoaded = function() {
  this.getScene().threeData.updateMatrixWorld();
  this.createCollider();
};

AmmoRigidBody.prototype.update = function() {
  if (this.rigidBody) {
    this.rigidBody.update();
  }
};

AmmoRigidBody.prototype.ammoWorldReady = function(ammoWorldComponent) {
  if (!this.ammoWorldComponent) {
    this.ammoWorldComponent = ammoWorldComponent;
    this.createCollider();
  }
};

AmmoRigidBody.prototype.createCollider = function() {
  if (this.rigidBody || this.getObject().state_hierarchy !== 'loaded' || !this.ammoWorldComponent) {
    return;
  }

  this.ammoWorldComponent.proxy.adapter.createRigidBodyFromObject(this.getThreeData(), this.mass, 
      this.shape)
    .then(_.bind(function(rigidBody) {
      this.rigidBody = rigidBody;
      this.setType(this.type);
      this.setRestitution(this.restitution);
      this.setFriction(this.friction);
      this.setDamping(this.linearDamping, this.angularDamping);
      this.setLinearFactor(this.linearFactor);
      this.setAngularFactor(this.angularFactor);
      rigidBody.addToWorld();
      this.getObject().trigger('ammo_rigidbody_ready', this);
    }, this))
    .otherwise(function(err) {
      console.error('An error occured while adding the rigid body', err.message);                            
    });
};

AmmoRigidBody.prototype.setDamping = function(linearDamping, angularDamping) {
  if (!this.rigidBody) {
    return console.error('setDamping called before rigidBody created!');
  }

  return this.rigidBody.setDamping(linearDamping, angularDamping);
};

AmmoRigidBody.prototype.setType = function(type) {
  if (!this.rigidBody) {
    return console.error('setType called before rigidBody created!');
  }

  return this.rigidBody.setType(type);
};

AmmoRigidBody.prototype.applyTorque = function(torque) {
  if (!this.rigidBody) {
    return console.error('applyTorque called before rigidBody created!');
  }

  return this.rigidBody.applyTorque(torque);
};

AmmoRigidBody.prototype.applyForce = function(force, relativePosition) {
  if (!this.rigidBody) {
    return console.error('applyForce called before rigidBody created!');
  }

  return this.rigidBody.applyForce(force, relativePosition);
};

AmmoRigidBody.prototype.applyCentralForce = function(force) {
  if (!this.rigidBody) {
    return console.error('applyCentralForce called before rigidBody created!');
  }

  return this.rigidBody.applyCentralForce(force);
};

AmmoRigidBody.prototype.applyImpulse = function(impulse, relativePosition) {
  if (!this.rigidBody) {
    return console.error('applyImpulse called before rigidBody created!');
  }

  return this.rigidBody.applyImpulse(impulse, relativePosition);
};

AmmoRigidBody.prototype.applyCentralImpulse = function(impulse) {
  if (!this.rigidBody) {
    return console.error('applyCentralImpulse called before rigidBody created!');
  }

  return this.rigidBody.applyCentralImpulse(impulse);
};

AmmoRigidBody.prototype.setFriction = function(friction) {
  if (!this.rigidBody) {
    return console.error('setFriction called before rigidBody created!');
  }

  return this.rigidBody.setFriction(friction);
};

AmmoRigidBody.prototype.setRestitution = function(restitution) {
  if (!this.rigidBody) {
    return console.error('setRestitution called before rigidBody created!');
  }

  return this.rigidBody.setRestitution(restitution);
};

AmmoRigidBody.prototype.setLinearFactor = function(linearFactor) {
  if (!this.rigidBody) {
    return console.error('setLinearFactor called before rigidBody created!');
  }

  return this.rigidBody.setLinearFactor(linearFactor);
};

AmmoRigidBody.prototype.setAngularFactor = function(angularFactor) {
  if (!this.rigidBody) {
    return console.error('setAngularFactor called before rigidBody created!');
  }

  return this.rigidBody.setAngularFactor(angularFactor);
};

AmmoRigidBody.prototype.setWorldTransform = function(position, rotation) {
  if (!this.rigidBody) {
    return console.error('setWorldTransform called before rigidBody created!');
  }

  return this.rigidBody.setWorldTransform(position, rotation);  
};

AmmoRigidBody.prototype.clearForces = function() {
  if (!this.rigidBody) {
    return console.error('clearForces called before rigidBody created!');
  }

  return this.rigidBody.clearForces();  
};

AmmoRigidBody.prototype.setLinearVelocity = function(linearVelocity) {
  if (!this.rigidBody) {
    return console.error('setLinearVelocity called before rigidBody created!');    
  }
  
  return this.rigidBody.setLinearVelocity(linearVelocity);
};

AmmoRigidBody.prototype.setAngularVelocity = function(angularVelocity) {
  if (!this.rigidBody) {
    return console.error('setAngularVelocity called before rigidBody created!');    
  }
  
  return this.rigidBody.setAngularVelocity(angularVelocity);
};

return AmmoRigidBody;
