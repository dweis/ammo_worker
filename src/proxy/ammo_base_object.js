define([ 'underscore', 'vendor/backbone.events' ], function(_, Events) {
  function AmmoBaseObject() {
  }

  _.extend(AmmoBaseObject.prototype, Events);

  return AmmoBaseObject;  
});
