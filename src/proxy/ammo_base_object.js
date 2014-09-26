var _ = require('underscore'),
    Events = require('../vendor/backbone.events');

function AmmoBaseObject() {
}

_.extend(AmmoBaseObject.prototype, Events);

module.exports = AmmoBaseObject;
