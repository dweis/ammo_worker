(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.AmmoProxy = factory();
  }
}(this, function () {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("vendor/almond", function(){});

/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 * @version 2.5.1
 */
(function(define, global) { 
define('when',['require'],function (require) {

	// Public API

	when.promise   = promise;    // Create a pending promise
	when.resolve   = resolve;    // Create a resolved promise
	when.reject    = reject;     // Create a rejected promise
	when.defer     = defer;      // Create a {promise, resolver} pair

	when.join      = join;       // Join 2 or more promises

	when.all       = all;        // Resolve a list of promises
	when.map       = map;        // Array.map() for promises
	when.reduce    = reduce;     // Array.reduce() for promises
	when.settle    = settle;     // Settle a list of promises

	when.any       = any;        // One-winner race
	when.some      = some;       // Multi-winner race

	when.isPromise = isPromiseLike;  // DEPRECATED: use isPromiseLike
	when.isPromiseLike = isPromiseLike; // Is something promise-like, aka thenable

	/**
	 * Register an observer for a promise or immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @param {function?} [onFulfilled] callback to be called when promiseOrValue is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} [onRejected] callback to be called when promiseOrValue is
	 *   rejected.
	 * @param {function?} [onProgress] callback to be called when progress updates
	 *   are issued for promiseOrValue.
	 * @returns {Promise} a new {@link Promise} that will complete with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
		// Get a trusted promise for the input promiseOrValue, and then
		// register promise handlers
		return cast(promiseOrValue).then(onFulfilled, onRejected, onProgress);
	}

	function cast(x) {
		return x instanceof Promise ? x : resolve(x);
	}

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @param {function} sendMessage function to deliver messages to the promise's handler
	 * @param {function?} inspect function that reports the promise's state
	 * @name Promise
	 */
	function Promise(sendMessage, inspect) {
		this._message = sendMessage;
		this.inspect = inspect;
	}

	Promise.prototype = {
		/**
		 * Register handlers for this promise.
		 * @param [onFulfilled] {Function} fulfillment handler
		 * @param [onRejected] {Function} rejection handler
		 * @param [onProgress] {Function} progress handler
		 * @return {Promise} new Promise
		 */
		then: function(onFulfilled, onRejected, onProgress) {
			/*jshint unused:false*/
			var args, sendMessage;

			args = arguments;
			sendMessage = this._message;

			return _promise(function(resolve, reject, notify) {
				sendMessage('when', args, resolve, notify);
			}, this._status && this._status.observed());
		},

		/**
		 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		otherwise: function(onRejected) {
			return this.then(undef, onRejected);
		},

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} onFulfilledOrRejected handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		ensure: function(onFulfilledOrRejected) {
			return typeof onFulfilledOrRejected === 'function'
				? this.then(injectHandler, injectHandler)['yield'](this)
				: this;

			function injectHandler() {
				return resolve(onFulfilledOrRejected());
			}
		},

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		'yield': function(value) {
			return this.then(function() {
				return value;
			});
		},

		/**
		 * Runs a side effect when this promise fulfills, without changing the
		 * fulfillment value.
		 * @param {function} onFulfilledSideEffect
		 * @returns {Promise}
		 */
		tap: function(onFulfilledSideEffect) {
			return this.then(onFulfilledSideEffect)['yield'](this);
		},

		/**
		 * Assumes that this promise will fulfill with an array, and arranges
		 * for the onFulfilled to be called with the array as its argument list
		 * i.e. onFulfilled.apply(undefined, array).
		 * @param {function} onFulfilled function to receive spread arguments
		 * @return {Promise}
		 */
		spread: function(onFulfilled) {
			return this.then(function(array) {
				// array may contain promises, so resolve its contents.
				return all(array, function(array) {
					return onFulfilled.apply(undef, array);
				});
			});
		},

		/**
		 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected)
		 * @deprecated
		 */
		always: function(onFulfilledOrRejected, onProgress) {
			return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
		}
	};

	/**
	 * Returns a resolved promise. The returned promise will be
	 *  - fulfilled with promiseOrValue if it is a value, or
	 *  - if promiseOrValue is a promise
	 *    - fulfilled with promiseOrValue's value after it is fulfilled
	 *    - rejected with promiseOrValue's reason after it is rejected
	 * @param  {*} value
	 * @return {Promise}
	 */
	function resolve(value) {
		return promise(function(resolve) {
			resolve(value);
		});
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @param {*} promiseOrValue the rejected value of the returned {@link Promise}
	 * @return {Promise} rejected {@link Promise}
	 */
	function reject(promiseOrValue) {
		return when(promiseOrValue, rejected);
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * The resolver has resolve, reject, and progress.  The promise
	 * has then plus extended promise API.
	 *
	 * @return {{
	 * promise: Promise,
	 * resolve: function:Promise,
	 * reject: function:Promise,
	 * notify: function:Promise
	 * resolver: {
	 *	resolve: function:Promise,
	 *	reject: function:Promise,
	 *	notify: function:Promise
	 * }}}
	 */
	function defer() {
		var deferred, pending, resolved;

		// Optimize object shape
		deferred = {
			promise: undef, resolve: undef, reject: undef, notify: undef,
			resolver: { resolve: undef, reject: undef, notify: undef }
		};

		deferred.promise = pending = promise(makeDeferred);

		return deferred;

		function makeDeferred(resolvePending, rejectPending, notifyPending) {
			deferred.resolve = deferred.resolver.resolve = function(value) {
				if(resolved) {
					return resolve(value);
				}
				resolved = true;
				resolvePending(value);
				return pending;
			};

			deferred.reject  = deferred.resolver.reject  = function(reason) {
				if(resolved) {
					return resolve(rejected(reason));
				}
				resolved = true;
				rejectPending(reason);
				return pending;
			};

			deferred.notify  = deferred.resolver.notify  = function(update) {
				notifyPending(update);
				return update;
			};
		}
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return _promise(resolver, monitorApi.PromiseStatus && monitorApi.PromiseStatus());
	}

	/**
	 * Creates a new promise, linked to parent, whose fate is determined
	 * by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @param {Promise?} status promise from which the new promise is begotten
	 * @returns {Promise} promise whose fate is determine by resolver
	 * @private
	 */
	function _promise(resolver, status) {
		var self, value, consumers = [];

		self = new Promise(_message, inspect);
		self._status = status;

		// Call the provider resolver to seal the promise's fate
		try {
			resolver(promiseResolve, promiseReject, promiseNotify);
		} catch(e) {
			promiseReject(e);
		}

		// Return the promise
		return self;

		/**
		 * Private message delivery. Queues and delivers messages to
		 * the promise's ultimate fulfillment value or rejection reason.
		 * @private
		 * @param {String} type
		 * @param {Array} args
		 * @param {Function} resolve
		 * @param {Function} notify
		 */
		function _message(type, args, resolve, notify) {
			consumers ? consumers.push(deliver) : enqueue(function() { deliver(value); });

			function deliver(p) {
				p._message(type, args, resolve, notify);
			}
		}

		/**
		 * Returns a snapshot of the promise's state at the instant inspect()
		 * is called. The returned object is not live and will not update as
		 * the promise's state changes.
		 * @returns {{ state:String, value?:*, reason?:* }} status snapshot
		 *  of the promise.
		 */
		function inspect() {
			return value ? value.inspect() : toPendingState();
		}

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the ultimate fulfillment or rejection
		 * @param {*|Promise} val resolution value
		 */
		function promiseResolve(val) {
			if(!consumers) {
				return;
			}

			var queue = consumers;
			consumers = undef;

			enqueue(function () {
				value = coerce(self, val);
				if(status) {
					updateStatus(value, status);
				}
				runHandlers(queue, value);
			});

		}

		/**
		 * Reject this promise with the supplied reason, which will be used verbatim.
		 * @param {*} reason reason for the rejection
		 */
		function promiseReject(reason) {
			promiseResolve(rejected(reason));
		}

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @param {*} update progress event payload to pass to all listeners
		 */
		function promiseNotify(update) {
			if(consumers) {
				var queue = consumers;
				enqueue(function () {
					runHandlers(queue, progressed(update));
				});
			}
		}
	}

	/**
	 * Run a queue of functions as quickly as possible, passing
	 * value to each.
	 */
	function runHandlers(queue, value) {
		for (var i = 0; i < queue.length; i++) {
			queue[i](value);
		}
	}

	/**
	 * Creates a fulfilled, local promise as a proxy for a value
	 * NOTE: must never be exposed
	 * @param {*} value fulfillment value
	 * @returns {Promise}
	 */
	function fulfilled(value) {
		return near(
			new NearFulfilledProxy(value),
			function() { return toFulfilledState(value); }
		);
	}

	/**
	 * Creates a rejected, local promise with the supplied reason
	 * NOTE: must never be exposed
	 * @param {*} reason rejection reason
	 * @returns {Promise}
	 */
	function rejected(reason) {
		return near(
			new NearRejectedProxy(reason),
			function() { return toRejectedState(reason); }
		);
	}

	/**
	 * Creates a near promise using the provided proxy
	 * NOTE: must never be exposed
	 * @param {object} proxy proxy for the promise's ultimate value or reason
	 * @param {function} inspect function that returns a snapshot of the
	 *  returned near promise's state
	 * @returns {Promise}
	 */
	function near(proxy, inspect) {
		return new Promise(function (type, args, resolve) {
			try {
				resolve(proxy[type].apply(proxy, args));
			} catch(e) {
				resolve(rejected(e));
			}
		}, inspect);
	}

	/**
	 * Create a progress promise with the supplied update.
	 * @private
	 * @param {*} update
	 * @return {Promise} progress promise
	 */
	function progressed(update) {
		return new Promise(function (type, args, _, notify) {
			var onProgress = args[2];
			try {
				notify(typeof onProgress === 'function' ? onProgress(update) : update);
			} catch(e) {
				notify(e);
			}
		});
	}

	/**
	 * Coerces x to a trusted Promise
	 * @param {*} x thing to coerce
	 * @returns {*} Guaranteed to return a trusted Promise.  If x
	 *   is trusted, returns x, otherwise, returns a new, trusted, already-resolved
	 *   Promise whose resolution value is:
	 *   * the resolution value of x if it's a foreign promise, or
	 *   * x if it's a value
	 */
	function coerce(self, x) {
		if (x === self) {
			return rejected(new TypeError());
		}

		if (x instanceof Promise) {
			return x;
		}

		try {
			var untrustedThen = x === Object(x) && x.then;

			return typeof untrustedThen === 'function'
				? assimilate(untrustedThen, x)
				: fulfilled(x);
		} catch(e) {
			return rejected(e);
		}
	}

	/**
	 * Safely assimilates a foreign thenable by wrapping it in a trusted promise
	 * @param {function} untrustedThen x's then() method
	 * @param {object|function} x thenable
	 * @returns {Promise}
	 */
	function assimilate(untrustedThen, x) {
		return promise(function (resolve, reject) {
			fcall(untrustedThen, x, resolve, reject);
		});
	}

	/**
	 * Proxy for a near, fulfilled value
	 * @param {*} value
	 * @constructor
	 */
	function NearFulfilledProxy(value) {
		this.value = value;
	}

	NearFulfilledProxy.prototype.when = function(onResult) {
		return typeof onResult === 'function' ? onResult(this.value) : this.value;
	};

	/**
	 * Proxy for a near rejection
	 * @param {*} reason
	 * @constructor
	 */
	function NearRejectedProxy(reason) {
		this.reason = reason;
	}

	NearRejectedProxy.prototype.when = function(_, onError) {
		if(typeof onError === 'function') {
			return onError(this.reason);
		} else {
			throw this.reason;
		}
	};

	function updateStatus(value, status) {
		value.then(statusFulfilled, statusRejected);

		function statusFulfilled() { status.fulfilled(); }
		function statusRejected(r) { status.rejected(r); }
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * howMany of the supplied promisesOrValues have resolved, or will reject when
	 * it becomes impossible for howMany to resolve, for example, when
	 * (promisesOrValues.length - howMany) + 1 input promises reject.
	 *
	 * @param {Array} promisesOrValues array of anything, may contain a mix
	 *      of promises and values
	 * @param howMany {number} number of promisesOrValues to resolve
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to an array of howMany values that
	 *  resolved first, or will reject with an array of
	 *  (promisesOrValues.length - howMany) + 1 rejection reasons.
	 */
	function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

		return when(promisesOrValues, function(promisesOrValues) {

			return promise(resolveSome).then(onFulfilled, onRejected, onProgress);

			function resolveSome(resolve, reject, notify) {
				var toResolve, toReject, values, reasons, fulfillOne, rejectOne, len, i;

				len = promisesOrValues.length >>> 0;

				toResolve = Math.max(0, Math.min(howMany, len));
				values = [];

				toReject = (len - toResolve) + 1;
				reasons = [];

				// No items in the input, resolve immediately
				if (!toResolve) {
					resolve(values);

				} else {
					rejectOne = function(reason) {
						reasons.push(reason);
						if(!--toReject) {
							fulfillOne = rejectOne = identity;
							reject(reasons);
						}
					};

					fulfillOne = function(val) {
						// This orders the values based on promise resolution order
						values.push(val);
						if (!--toResolve) {
							fulfillOne = rejectOne = identity;
							resolve(values);
						}
					};

					for(i = 0; i < len; ++i) {
						if(i in promisesOrValues) {
							when(promisesOrValues[i], fulfiller, rejecter, notify);
						}
					}
				}

				function rejecter(reason) {
					rejectOne(reason);
				}

				function fulfiller(val) {
					fulfillOne(val);
				}
			}
		});
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * any one of the supplied promisesOrValues has resolved or will reject when
	 * *all* promisesOrValues have rejected.
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise} promise that will resolve to the value that resolved first, or
	 * will reject with an array of all rejected inputs.
	 */
	function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

		function unwrapSingleResult(val) {
			return onFulfilled ? onFulfilled(val[0]) : val[0];
		}

		return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
	}

	/**
	 * Return a promise that will resolve only once all the supplied promisesOrValues
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the promisesOrValues.
	 * @memberOf when
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onRejected] DEPRECATED, use returnedPromise.then()
	 * @param {function?} [onProgress] DEPRECATED, use returnedPromise.then()
	 * @returns {Promise}
	 */
	function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
		return _map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Joins multiple promises into a single returned promise.
	 * @return {Promise} a promise that will fulfill when *all* the input promises
	 * have fulfilled, or will reject when *any one* of the input promises rejects.
	 */
	function join(/* ...promises */) {
		return _map(arguments, identity);
	}

	/**
	 * Settles all input promises such that they are guaranteed not to
	 * be pending once the returned promise fulfills. The returned promise
	 * will always fulfill, except in the case where `array` is a promise
	 * that rejects.
	 * @param {Array|Promise} array or promise for array of promises to settle
	 * @returns {Promise} promise that always fulfills with an array of
	 *  outcome snapshots for each input promise.
	 */
	function settle(array) {
		return _map(array, toFulfilledState, toRejectedState);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(array, mapFunc) {
		return _map(array, mapFunc);
	}

	/**
	 * Internal map that allows a fallback to handle rejections
	 * @param {Array|Promise} array array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @param {function?} fallback function to handle rejected promises
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function _map(array, mapFunc, fallback) {
		return when(array, function(array) {

			return _promise(resolveMap);

			function resolveMap(resolve, reject, notify) {
				var results, len, toResolve, i;

				// Since we know the resulting length, we can preallocate the results
				// array to avoid array expansions.
				toResolve = len = array.length >>> 0;
				results = [];

				if(!toResolve) {
					resolve(results);
					return;
				}

				// Since mapFunc may be async, get all invocations of it into flight
				for(i = 0; i < len; i++) {
					if(i in array) {
						resolveOne(array[i], i);
					} else {
						--toResolve;
					}
				}

				function resolveOne(item, i) {
					when(item, mapFunc, fallback).then(function(mapped) {
						results[i] = mapped;

						if(!--toResolve) {
							resolve(results);
						}
					}, reject, notify);
				}
			}
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promise array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),
	 *      where total is the total number of items being reduced, and will be the same
	 *      in each call to reduceFunc.
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promise, reduceFunc /*, initialValue */) {
		var args = fcall(slice, arguments, 1);

		return when(promise, function(array) {
			var total;

			total = array.length;

			// Wrap the supplied reduceFunc with one that handles promises and then
			// delegates to the supplied.
			args[0] = function (current, val, i) {
				return when(current, function (c) {
					return when(val, function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};

			return reduceArray.apply(array, args);
		});
	}

	// Snapshot states

	/**
	 * Creates a fulfilled state snapshot
	 * @private
	 * @param {*} x any value
	 * @returns {{state:'fulfilled',value:*}}
	 */
	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	/**
	 * Creates a rejected state snapshot
	 * @private
	 * @param {*} x any reason
	 * @returns {{state:'rejected',reason:*}}
	 */
	function toRejectedState(x) {
		return { state: 'rejected', reason: x };
	}

	/**
	 * Creates a pending state snapshot
	 * @private
	 * @returns {{state:'pending'}}
	 */
	function toPendingState() {
		return { state: 'pending' };
	}

	//
	// Internals, utilities, etc.
	//

	var reduceArray, slice, fcall, nextTick, handlerQueue,
		setTimeout, funcProto, call, arrayProto, monitorApi,
		cjsRequire, MutationObserver, undef;

	cjsRequire = require;

	//
	// Shared handler queue processing
	//
	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for
	// next-tick conflation.

	handlerQueue = [];

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	function enqueue(task) {
		if(handlerQueue.push(task) === 1) {
			nextTick(drainQueue);
		}
	}

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	function drainQueue() {
		runHandlers(handlerQueue);
		handlerQueue = [];
	}

	// capture setTimeout to avoid being caught by fake timers
	// used in time based tests
	setTimeout = global.setTimeout;

	// Allow attaching the monitor to when() if env has no console
	monitorApi = typeof console != 'undefined' ? console : when;

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout
	/*global process*/
	if (typeof process === 'object' && process.nextTick) {
		nextTick = process.nextTick;
	} else if(MutationObserver = global.MutationObserver || global.WebKitMutationObserver) {
		nextTick = (function(document, MutationObserver, drainQueue) {
			var el = document.createElement('div');
			new MutationObserver(drainQueue).observe(el, { attributes: true });

			return function() {
				el.setAttribute('x', 'x');
			};
		}(document, MutationObserver, drainQueue));
	} else {
		try {
			// vert.x 1.x || 2.x
			nextTick = cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
		} catch(ignore) {
			nextTick = function(t) { setTimeout(t, 0); };
		}
	}

	//
	// Capture/polyfill function and array utils
	//

	// Safe function calls
	funcProto = Function.prototype;
	call = funcProto.call;
	fcall = funcProto.bind
		? call.bind(call)
		: function(f, context) {
			return f.apply(context, slice.call(arguments, 2));
		};

	// Safe array ops
	arrayProto = [];
	slice = arrayProto.slice;

	// ES5 reduce implementation if native not available
	// See: http://es5.github.com/#x15.4.4.21 as there are many
	// specifics and edge cases.  ES5 dictates that reduce.length === 1
	// This implementation deviates from ES5 spec in the following ways:
	// 1. It does not check if reduceFunc is a Callable
	reduceArray = arrayProto.reduce ||
		function(reduceFunc /*, initialValue */) {
			/*jshint maxcomplexity: 7*/
			var arr, args, reduced, len, i;

			i = 0;
			arr = Object(this);
			len = arr.length >>> 0;
			args = arguments;

			// If no initialValue, use first item of array (we know length !== 0 here)
			// and adjust i to start at second item
			if(args.length <= 1) {
				// Skip to the first real element in the array
				for(;;) {
					if(i in arr) {
						reduced = arr[i++];
						break;
					}

					// If we reached the end of the array without finding any real
					// elements, it's a TypeError
					if(++i >= len) {
						throw new TypeError();
					}
				}
			} else {
				// If initialValue provided, use it
				reduced = args[1];
			}

			// Do the actual reduce
			for(;i < len; ++i) {
				if(i in arr) {
					reduced = reduceFunc(reduced, arr[i], i, arr);
				}
			}

			return reduced;
		};

	function identity(x) {
		return x;
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }, this);

//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD define happens at the end for compatibility with AMD loaders
  // that don't enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [],function() {
      return _;
    });
  }

}).call(this);

/* global importScripts */
define('ammo_worker_api',[], function() {
  

  function AmmoWorkerAPI(opts) {
    this.maxBodies = 1000;
    this.maxVehicles = 32;
    this.maxWheelsPerVehicle = 8;
    this.maxKinematicCharacterControllers = 16;
    this.maxGhostObjects = 500;

    for (var i in opts) {
      if (opts.hasOwnProperty(i)) {
        this[i] = opts[i];
      }
    }
  }

  AmmoWorkerAPI.prototype = {
    collisionFlags: {
      CF_STATIC_OBJECT: 1, 
      CF_KINEMATIC_OBJECT: 2, 
      CF_NO_CONTACT_RESPONSE: 4, 
      CF_CUSTOM_MATERIAL_CALLBACK: 8, 
      CF_CHARACTER_OBJECT: 16, 
      CF_DISABLE_VISUALIZE_OBJECT: 32, 
      CF_DISABLE_SPU_COLLISION_PROCESSING: 64 
    },

    activationStates: {
      ACTIVE_TAG: 1,
      ISLAND_SLEEPING: 2,
      WANTS_DEACTIVATION: 3,
      DISABLE_DEACTIVATION: 4,
      DISABLE_SIMULATION: 5
    }, 

    collisionFilterGroups:  {
      DefaultFilter: 1,
      StaticFilter: 2,
      KinematicFilter: 4,
      DebrisFilter: 8,
      SensorTrigger: 16,
      CharacterFilter: 32,
      AllFilter: -1 //all bits sets: DefaultFilter | StaticFilter | KinematicFilter | DebrisFilter | SensorTrigger
    },

    init: function() {
      var bufferSize = 
            // FLOAT64 Types
            (8 * 
              (
                // Rigid Bodies
                (this.maxBodies * 7 ) + 
                // Vehicles
                (this.maxVehicles * this.maxWheelsPerVehicle * 7) +
                // Character Controllers
                (this.maxKinematicCharacterControllers * 7) + 
                (this.maxGhostObjects * 7)
              )
            );


      this.OFFSET_RIGID_BODY = 0;
      this.OFFSET_VEHICLE = this.maxBodies * 7;
      this.OFFSET_KINEMATIC_CHARACTER = this.OFFSET_VEHICLE + (this.maxVehicles * this.maxWheelsPerVehicle * 7);
      this.OFFSET_GHOST_OBJECT = this.OFFSET_KINEMATIC_CHARACTER + this.maxKinematicCharacterControllers * 7;

      //import Scripts('./js/ammo.js');
     importScripts('http://assets.verold.com/verold_api/lib/ammo.js?bust=v3');

      this.tmpVec = [
        new Ammo.btVector3(),
        new Ammo.btVector3(),
        new Ammo.btVector3(),
        new Ammo.btVector3()
      ];

      this.tmpQuaternion = [
        new Ammo.btQuaternion(),
        new Ammo.btQuaternion()
      ];

      this.tmpTrans = [
        new Ammo.btTransform(),
        new Ammo.btTransform()
      ];

      this.bodies = [];
      this.vehicles = [];
      this.constraints = [];
      this.ghosts = [];
      this.characterControllers = [];

      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);

      this.overlappingPairCache = new Ammo.btDbvtBroadphase();

      /*
      this.tmpVec[0].setX(-1000);
      this.tmpVec[0].setY(-1000);
      this.tmpVec[0].setZ(-1000);
      this.tmpVec[1].setX(1000);
      this.tmpVec[1].setY(1000);
      this.tmpVec[1].setZ(1000);
      this.overlappingPairCache = new Ammo.btAxisSweep3(this.tmpVec[0], this.tmpVec[1]);
      */
      
      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher,
          this.overlappingPairCache, this.solver, this.collisionConfiguration);

      this.ghostPairCallback = new Ammo.btGhostPairCallback();
      this.dynamicsWorld.getPairCache().setInternalGhostPairCallback(this.ghostPairCallback);

      this.dynamicsWorld.getDispatchInfo().set_m_allowedCcdPenetration(0.0001);

      this.buffers = [
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize),
        new ArrayBuffer(bufferSize)
      ];

      this.ghostCollisions = {};

      this.fire('ready');
    },

    getStats: function(undefined, fn) {
      return fn({
        totalTime: this.totalTime,
        frames: this.frames,
        fps: this.fps,
        buffersReady: this.buffers.length
      });
    },

    startSimulation: function() {
      var that = this, last = Date.now();

      that.totalTime = 0;
      that.frames = 0;

      this.simulationTimerId = setInterval(function() {
        var vehicle, update, i, j, pos, now = Date.now(),
            delta = (now - last) / 1000;

        that.dynamicsWorld.stepSimulation(delta/*that.step*/, that.iterations, that.step);

        if (that.buffers.length > 0) {
          update = new Float64Array(that.buffers.pop());
        }

        if (update && update.buffer instanceof ArrayBuffer) {
          for (i in that.bodies) {
            if (that.bodies[i]) {
              that.tmpTrans[0].setIdentity();
              that.bodies[i].getMotionState().getWorldTransform(that.tmpTrans[0]);
              pos = that.OFFSET_RIGID_BODY + (i * 7);

              update[pos + 0] = that.tmpTrans[0].getOrigin().x();
              update[pos + 1] = that.tmpTrans[0].getOrigin().y();
              update[pos + 2] = that.tmpTrans[0].getOrigin().z();
              update[pos + 3] = that.tmpTrans[0].getRotation().x();
              update[pos + 4] = that.tmpTrans[0].getRotation().y();
              update[pos + 5] = that.tmpTrans[0].getRotation().z();
              update[pos + 6] = that.tmpTrans[0].getRotation().w();
            }
          }

          for (i in that.vehicles) {
            if (that.vehicles[i]) {
              vehicle = that.vehicles[i];

              for ( j = 0; j < vehicle.getNumWheels() + 1; j++ ) {
                that.tmpTrans[0] = vehicle.getWheelInfo(j).get_m_worldTransform();
                pos = that.OFFSET_VEHICLE + (i * that.maxWheelsPerVehicle * 7) + (j * 7);

                update[pos + 0] = that.tmpTrans[0].getOrigin().x();
                update[pos + 1] = that.tmpTrans[0].getOrigin().y();
                update[pos + 2] = that.tmpTrans[0].getOrigin().z();
                update[pos + 3] = that.tmpTrans[0].getRotation().x();
                update[pos + 4] = that.tmpTrans[0].getRotation().y();
                update[pos + 5] = that.tmpTrans[0].getRotation().z();
                update[pos + 6] = that.tmpTrans[0].getRotation().w();
              }
            }
          }

          for (i in that.characterControllers) {
            if (that.characterControllers[i]) {
              var trans = that.characterControllers[i].getGhostObject().getWorldTransform();
              pos = that.OFFSET_KINEMATIC_CHARACTER + (i * 7);

              update[pos + 0] = trans.getOrigin().x();
              update[pos + 1] = trans.getOrigin().y();
              update[pos + 2] = trans.getOrigin().z();
              update[pos + 3] = trans.getRotation().x();
              update[pos + 4] = trans.getRotation().y();
              update[pos + 5] = trans.getRotation().z();
              update[pos + 6] = trans.getRotation().w();
            }  
          }

          that.ghosts.forEach(function(ghost, id) {
            if (ghost) {
              var trans = ghost.getWorldTransform();
              pos = that.OFFSET_GHOST_OBJECT + (id * 7);

              update[pos + 0] = trans.getOrigin().x();
              update[pos + 1] = trans.getOrigin().y();
              update[pos + 2] = trans.getOrigin().z();
              update[pos + 3] = trans.getRotation().x();
              update[pos + 4] = trans.getRotation().y();
              update[pos + 5] = trans.getRotation().z();
              update[pos + 6] = trans.getRotation().w();

              that.ghostCollisions[id] = that.ghostCollisions[id] || {};

              var i, 
                  idx,
                  num = ghost.getNumOverlappingObjects(),
                  newCollisions = {},
                  body;

              if (num > 0) {
                for (i = 0; i < num; i++) {
                  body = Ammo.castObject(ghost.getOverlappingObject(i), Ammo.btRigidBody);
                  newCollisions[body.id] = true;

                  if (!that.ghostCollisions[id][body.id]) {
                    that.fire('ghost_enter', { 
                      objectA: { type: 'ghost', id: id },
                      objectB: { type: 'rigidBody', id: body.id }
                    });  
                  }
                }
              } 

              for (idx in that.ghostCollisions[id]) {
                if (!newCollisions[idx]) {
                  that.fire('ghost_exit', { 
                    objectA: { type: 'ghost', id: id },
                    objectB: { type: 'rigidBody', id: idx }
                  });
                  that.ghostCollisions[id][idx] = false; 
                }
              }
              that.ghostCollisions[id] = newCollisions;
            }
          }.bind(this));

          that.fire('update', update.buffer, [update.buffer]);
          that.frames ++;

          last = now;
          that.totalTime += delta;
          that.fps = Math.round( that.frames / that.totalTime );
        }
      }, this.step * 1000);
    },

    stopSimulation: function() {
      if (this.simulationTimerId) {
        clearInterval(this.simulationTimerId);
      }
    },

    swap: function(buf) {
      if (buf instanceof ArrayBuffer) {
        this.buffers.push(buf);
      }
    },

    setStep: function(step) {
      this.step = step;
    },

    setIterations: function(iterations) {
      this.iterations = iterations;
    },

    setGravity: function(gravity) {
      this.tmpVec[0].setX(gravity.x);
      this.tmpVec[0].setY(gravity.y);
      this.tmpVec[0].setZ(gravity.z);
      this.dynamicsWorld.setGravity(this.tmpVec[0]);
    },

    _createCompoundShape: function(shape) {
      var compound = new Ammo.btCompoundShape(),
          localTransform = this.tmpTrans[0],
          child,
          childShape;

      if (shape.children && shape.children.length) {
        for (var idx in shape.children) {
          if (shape.children.hasOwnProperty(idx)) {
            child = shape.children[idx];
            childShape = this._createShape(child);
            localTransform.setIdentity();
            this.tmpVec[0].setX(child.localTransform.position.x);
            this.tmpVec[0].setY(child.localTransform.position.y);
            this.tmpVec[0].setZ(child.localTransform.position.z);
            localTransform.setOrigin(this.tmpVec[0]);
            this.tmpQuaternion[0].setX(child.localTransform.rotation.x);
            this.tmpQuaternion[0].setY(child.localTransform.rotation.y);
            this.tmpQuaternion[0].setZ(child.localTransform.rotation.z);
            this.tmpQuaternion[0].setW(child.localTransform.rotation.w);
            localTransform.setRotation(this.tmpQuaternion[0]);
            compound.addChildShape(localTransform, childShape);
          }
        }
      }

      return compound;
    },

    _createConvexHullMeshShape: function(shape) {
      var colShape;

      if (!shape.vertices) {
        throw new Error('You must supply a list of vertices!');
      }

      colShape = new Ammo.btConvexHullShape();

      for (var i = 0; i < shape.vertices.length/3; i+=3) {
        this.tmpVec[0].setX(shape.vertices[i*3+0]);
        this.tmpVec[0].setY(shape.vertices[i*3+1]);
        this.tmpVec[0].setZ(shape.vertices[i*3+2]);
        colShape.addPoint(this.tmpVec[0]); 
      }

      return colShape;
    },

    _createTriangleMeshShape: function(shape, type) {
      var i, mesh, className;

      if (!shape.triangles) {
        throw new Error('You must supply a list of triangles!');
      }

      switch (type) {
        case 'bvh':
          className = 'btBvhTriangleMeshShape';
          break;

        case 'convex':
          className = 'btConvexTriangleMeshShape';
          break;

        default:
          throw new Error('You must supply a valid mesh type!');
      }

      mesh = new Ammo.btTriangleMesh(true, true);

      for (i = 0; i < shape.triangles.length/9; i ++) {
        this.tmpVec[0].setX(shape.triangles[i * 9 + 0]);
        this.tmpVec[0].setY(shape.triangles[i * 9 + 1]);
        this.tmpVec[0].setZ(shape.triangles[i * 9 + 2]);

        this.tmpVec[1].setX(shape.triangles[i * 9 + 3]);
        this.tmpVec[1].setY(shape.triangles[i * 9 + 4]);
        this.tmpVec[1].setZ(shape.triangles[i * 9 + 5]);

        this.tmpVec[2].setX(shape.triangles[i * 9 + 6]);
        this.tmpVec[2].setY(shape.triangles[i * 9 + 7]);
        this.tmpVec[2].setZ(shape.triangles[i * 9 + 8]);

        mesh.addTriangle(this.tmpVec[0], this.tmpVec[1], this.tmpVec[2], false);
      }

      return new Ammo[className](mesh, true, true);
    },

    _createShape: function(shape) {
      var colShape;
      switch(shape.shape) {
      case 'box':
        this.tmpVec[0].setX(shape.halfExtents.x);
        this.tmpVec[0].setY(shape.halfExtents.y);
        this.tmpVec[0].setZ(shape.halfExtents.z);
        colShape = new Ammo.btBoxShape(this.tmpVec[0]);
        break;
      case 'sphere':
        colShape = new Ammo.btSphereShape(shape.radius);
        break;
      case 'staticplane':
        this.tmpVec[0].setX(shape.normal.x);
        this.tmpVec[0].setY(shape.normal.y);
        this.tmpVec[0].setZ(shape.normal.z);
        colShape = new Ammo.btStaticPlaneShape(this.tmpVec[0], shape.distance);
        break;
      case 'cylinder':
        this.tmpVec[0].setX(shape.width);
        this.tmpVec[0].setY(shape.height);
        this.tmpVec[0].setZ(shape.depth);
        colShape = new Ammo.btCylinderShape(this.tmpVec[0]);
        break;
      case 'capsule':
        colShape = new Ammo.btCapsuleShape(shape.radius, shape.height);
        break;
      case 'cone':
        colShape = new Ammo.btConeShape(shape.radius, shape.height);
        break;
      case 'compound':
        colShape = this._createCompoundShape(shape);
        break;
      case 'convex_hull_mesh':
        colShape = this._createConvexHullMeshShape(shape);
        break;
      case 'convex_triangle_mesh':
        colShape = this._createTriangleMeshShape(shape, 'convex');
        break;
      case 'bvh_triangle_mesh':
        colShape = this._createTriangleMeshShape(shape, 'bvh');
        break;
      default:
        return console.error('Unknown shape: ' + shape.shape);
      }
      return colShape;
    },

    Broadphase_aabbTest: function(descriptor, fn) {
      var that = this;

      if (!this.aabbCallback) {
        this.aabbCallback = new Ammo.ConcreteBroadphaseAabbCallback();
        this.aabbCallback.bodies = [];

        (function() {
          Ammo.customizeVTable(that.aabbCallback, [{
            original: Ammo.ConcreteBroadphaseAabbCallback.prototype.process,
            replacement: function(thisPtr, proxyPtr) {
              var proxy = Ammo.wrapPointer(proxyPtr, Ammo.btBroadphaseProxy);
              var clientObject = Ammo.wrapPointer(proxy.get_m_clientObject(), Ammo.btRigidBody);
              var _this = Ammo.wrapPointer(thisPtr, Ammo.ConcreteBroadphaseAabbCallback);

              if (clientObject.id) {
                _this.bodies.push(clientObject.id);
              }

              return true;
            }
          }]);
        })();
      }

      this.tmpVec[0].setX(descriptor.min.x);
      this.tmpVec[0].setY(descriptor.min.y);
      this.tmpVec[0].setZ(descriptor.min.z);

      this.tmpVec[1].setX(descriptor.max.x);
      this.tmpVec[1].setY(descriptor.max.y);
      this.tmpVec[1].setZ(descriptor.max.z);

      this.aabbCallback.bodies = [];
      this.dynamicsWorld
        .getBroadphase()
        .aabbTest(this.tmpVec[0], this.tmpVec[1],
          this.aabbCallback);

      fn(this.aabbCallback.bodies);
    },

    Vehicle_create: function(descriptor, fn) {
      var vehicleTuning = new Ammo.btVehicleTuning(),
          body = this.bodies[descriptor.bodyId],
          vehicle;

      if (!body) {
        return console.error('could not find body');
      }

      if (descriptor.tuning) {
        if (descriptor.tuning.suspensionStiffness) {
          vehicleTuning.set_m_suspensionStiffness(descriptor.tuning.suspensionStiffness);
        }

        if (descriptor.tuning.suspensionCompression) {
          vehicleTuning.set_m_suspensionCompression(descriptor.tuning.suspensionCompression);
        }

        if (descriptor.tuning.suspensionDamping) {
          vehicleTuning.set_m_suspensionDamping(descriptor.tuning.suspensionDamping);
        }

        if (descriptor.tuning.maxSuspensionTravelCm) {
          vehicleTuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm);
        }

        if (descriptor.tuning.maxSuspensionForce) {
          vehicleTuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
        }

        if (descriptor.tuning.frictionSlip) {
          vehicleTuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
        }
      }

      vehicle = new Ammo.btRaycastVehicle(vehicleTuning, body, new Ammo.btDefaultVehicleRaycaster(this.dynamicsWorld));
      vehicle.tuning = vehicleTuning;

      body.setActivationState(this.activationStates.DISABLE_DEACTIVATION);
      vehicle.setCoordinateSystem(0, 1, 2);

      this.dynamicsWorld.addVehicle(vehicle);
      var idx = this.vehicles.push(vehicle) - 1;
      vehicle.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    Vehicle_addWheel: function(descriptor, fn) {
      var vehicle = this.vehicles[descriptor.vehicleId];

      if (vehicle !== undefined) {
        var tuning = vehicle.tuning,
            connectionPoint = this.tmpVec[0],
            wheelDirection = this.tmpVec[1],
            wheelAxle = this.tmpVec[2];


        if (typeof descriptor.tuning === 'object') {
          tuning = new Ammo.btVehicleTuning();

          if (descriptor.tuning.suspensionStiffness) {
            tuning.set_m_suspensionStiffness(descriptor.tuning.suspensionStiffness);
          }

          if (descriptor.tuning.suspensionCompression) {
            tuning.set_m_suspensionCompression(descriptor.tuning.suspensionCompression);
          }

          if (descriptor.tuning.suspensionDamping) {
            tuning.set_m_suspensionDamping(descriptor.tuning.suspensionDamping);
          }

          if (descriptor.tuning.maxSuspensionTravelCm) {
            tuning.set_m_maxSuspensionTravelCm(descriptor.tuning.maxSuspensionTravelCm);
          }

          if (descriptor.tuning.maxSuspensionForce) {
            tuning.set_m_maxSuspensionForce(descriptor.tuning.maxSuspensionForce);
          }

          if (descriptor.tuning.frictionSlip) {
            tuning.set_m_frictionSlip(descriptor.tuning.frictionSlip);
          }
        } 

        connectionPoint.setX(descriptor.connectionPoint.x);
        connectionPoint.setY(descriptor.connectionPoint.y);
        connectionPoint.setZ(descriptor.connectionPoint.z);

        wheelDirection.setX(descriptor.wheelDirection.x);
        wheelDirection.setY(descriptor.wheelDirection.y);
        wheelDirection.setZ(descriptor.wheelDirection.z);

        wheelAxle.setX(descriptor.wheelAxle.x);
        wheelAxle.setY(descriptor.wheelAxle.y);
        wheelAxle.setZ(descriptor.wheelAxle.z);

        vehicle.addWheel(
          connectionPoint,
          wheelDirection,
          wheelAxle,
          descriptor.suspensionRestLength,
          descriptor.wheelRadius,
          tuning,
          descriptor.isFrontWheel
        );

        if (typeof fn === 'function') {
          fn(vehicle.getNumWheels() - 1);
        }
      }
    },

    Vehicle_setSteeringValue: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].setSteeringValue(descriptor.steeringValue, descriptor.wheelIndex);
      }
    },

    Vehicle_setBrake: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].setBrake(descriptor.brake, descriptor.wheelIndex);
      }
    },

    Vehicle_setWheelInfo: function(descriptor) {  
      var vehicle = this.vehicles[descriptor.vehicleId],
          info;
      if (vehicle) {

        info = this.vehicles[descriptor.vehicleId].getWheelInfo(descriptor.wheelIndex);

        for (var i in descriptor.properties) {
          if (descriptor.properties.hasOwnProperty(i)) {
            info['set_m_' + i](descriptor.properties[i]); 
          }
        }
      }
    },

    Vehicle_applyEngineForce: function(descriptor) {
      var vehicle = this.vehicles[descriptor.vehicleId];
      if (vehicle) {
        this.vehicles[descriptor.vehicleId].applyEngineForce(descriptor.force, descriptor.wheelIndex);
      }
    },

    Point2PointConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        this.tmpVec[0].setX(descriptor.pivotA.x);
        this.tmpVec[0].setY(descriptor.pivotA.y);
        this.tmpVec[0].setZ(descriptor.pivotA.z); 

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          this.tmpVec[1].setX(descriptor.pivotB.x);
          this.tmpVec[1].setY(descriptor.pivotB.y);
          this.tmpVec[1].setZ(descriptor.pivotB.z); 
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB, this.tmpVec[0], this.tmpVec[1]);
        } else {
          constraint = new Ammo.btPoint2PointConstraint(rigidBodyA, rigidBodyB);
        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    SliderConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        var transformA = new Ammo.btTransform();

        this.tmpVec[0].setX(descriptor.frameInA.position.x);
        this.tmpVec[0].setY(descriptor.frameInA.position.y);
        this.tmpVec[0].setZ(descriptor.frameInA.position.z);

        this.tmpQuaternion[0].setX(descriptor.frameInA.rotation.x);
        this.tmpQuaternion[0].setY(descriptor.frameInA.rotation.y);
        this.tmpQuaternion[0].setZ(descriptor.frameInA.rotation.z);
        this.tmpQuaternion[0].setW(descriptor.frameInA.rotation.w);

        transformA.setOrigin(this.tmpVec[0]);
        transformA.setRotation(this.tmpQuaternion[0]);

        if (rigidBodyB) {
          var transformB = new Ammo.btTransform();

          this.tmpVec[1].setX(descriptor.frameInB.position.x);
          this.tmpVec[1].setY(descriptor.frameInB.position.y);
          this.tmpVec[1].setZ(descriptor.frameInB.position.z);

          this.tmpQuaternion[1].setX(descriptor.frameInB.rotation.x);
          this.tmpQuaternion[1].setY(descriptor.frameInB.rotation.y);
          this.tmpQuaternion[1].setZ(descriptor.frameInB.rotation.z);
          this.tmpQuaternion[1].setW(descriptor.frameInB.rotation.w);

          transformB.setOrigin(this.tmpVec[1]);
          transformB.setRotation(this.tmpQuaternion[1]);

          constraint = new Ammo.btSliderConstraint(rigidBodyA, rigidBodyB, 
            transformA, transformB);
        } else {

        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    SliderConstraint_setLowerLinLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLowerLinLimit(descriptor.limit);
      }
    },

    SliderConstraint_setUpperLinLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setUpperLinLimit(descriptor.limit);
      }
    },

    SliderConstraint_setLowerAngLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLowerAngLimit(descriptor.limit);
      }
    },

    SliderConstraint_setUpperAngLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setUpperAngLimit(descriptor.limit);
      }
    },

    HingeConstraint_create: function(descriptor, fn) {
      var rigidBodyA = this.bodies[descriptor.rigidBodyIdA],
          rigidBodyB = typeof descriptor.rigidBodyIdB !== 'undefined' && 
            this.bodies[descriptor.rigidBodyIdB],
          constraint,
          id;

      if (rigidBodyA) {
        this.tmpVec[0].setX(descriptor.pivotA.x);
        this.tmpVec[0].setY(descriptor.pivotA.y);
        this.tmpVec[0].setZ(descriptor.pivotA.z); 
        this.tmpVec[1].setX(descriptor.axisA.x);
        this.tmpVec[1].setX(descriptor.axisA.y);
        this.tmpVec[1].setX(descriptor.axisA.z);

        if (rigidBodyB) {
          rigidBodyB = this.bodies[descriptor.rigidBodyIdB];
          this.tmpVec[2].setX(descriptor.pivotB.x);
          this.tmpVec[2].setY(descriptor.pivotB.y);
          this.tmpVec[2].setZ(descriptor.pivotB.z); 
          this.tmpVec[3].setX(descriptor.axisB.x);
          this.tmpVec[3].setY(descriptor.axisB.y);
          this.tmpVec[3].setZ(descriptor.axisB.z); 
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              this.tmpVec[0], this.tmpVec[2], this.tmpVec[1], this.tmpVec[3]);
        } else {
          constraint = new Ammo.btHingeConstraint(rigidBodyA, rigidBodyB,
              this.tmpVec[0], this.tmpVec[1]);
        }

        id = this.constraints.push(constraint) - 1;

        this.dynamicsWorld.addConstraint(constraint);
        constraint.enableFeedback();

        if (typeof fn === 'function') {
          fn(id);
        }
      }
    },

    HingeConstraint_setLimit: function(descriptor) {
      var constraint = this.constraints[descriptor.constraintId];

      if (constraint) {
        constraint.setLimit(descriptor.low, descriptor.high, descriptor.softness,
              descriptor.biasFactor, descriptor.relaxationFactor);
      }
    },

    /*
    DynamicsWorld_rayTestAllHits: function(descriptor, fn) {
      this.tmpVec[0].setX(descriptor.rayFromWorld.x);
      this.tmpVec[0].setY(descriptor.rayFromWorld.y);
      this.tmpVec[0].setZ(descriptor.rayFromWorld.z);
      this.tmpVec[1].setX(descriptor.rayToWorld.x);
      this.tmpVec[1].setY(descriptor.rayToWorld.y);
      this.tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.AllHitsRayResultCallback(this.tmpVec[0], this.tmpVec[1]);

      this.dynamicsWorld.rayTest(this.tmpVec[0], this.tmpVec[1], callback);

      if (callback.hasHit()) {
        console.log('hits', callback.m_hitFractions.size());
      } else {
        if (typeof fn === 'function') {
          fn();
        }
      }

      Ammo.destroy(callback);
    },
    */

    DynamicsWorld_rayTestClosest: function(descriptor, fn) {
      this.tmpVec[0].setX(descriptor.rayFromWorld.x);
      this.tmpVec[0].setY(descriptor.rayFromWorld.y);
      this.tmpVec[0].setZ(descriptor.rayFromWorld.z);
      this.tmpVec[1].setX(descriptor.rayToWorld.x);
      this.tmpVec[1].setY(descriptor.rayToWorld.y);
      this.tmpVec[1].setZ(descriptor.rayToWorld.z);

      var callback = new Ammo.ClosestRayResultCallback(this.tmpVec[0], this.tmpVec[1]);

      this.dynamicsWorld.rayTest(this.tmpVec[0], this.tmpVec[1], callback);

      if (callback.hasHit()) {
        var body = Ammo.castObject(callback.get_m_collisionObject(), Ammo.btRigidBody);

        if (body.id) {
          if (typeof fn === 'function') {
            fn({
              type: 'btRigidBody', 
              bodyId: body.id,
              hitPointWorld: {
                x: callback.get_m_hitPointWorld().x(),
                y: callback.get_m_hitPointWorld().y(),
                z: callback.get_m_hitPointWorld().z()
              },
              hitNormalWorld: {
                x: callback.get_m_hitNormalWorld().x(),
                y: callback.get_m_hitNormalWorld().y(),
                z: callback.get_m_hitNormalWorld().z()
              }
            });
          }
        }
      } else {
        if (typeof fn === 'function') {
          fn();
        }
      }

      Ammo.destroy(callback);
    },

    DynamicsWorld_addRigidBody: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.dynamicsWorld.addRigidBody(body, descriptor.group, descriptor.mask);
      }
    },

    DynamicsWorld_addGhostObject: function(descriptor) {
      var ghost = this.ghosts[descriptor.ghostId];

      if (ghost) {
        this.dynamicsWorld.addCollisionObject(ghost, descriptor.group, descriptor.mask);  
      }
    },

    GhostObject_create: function(descriptor, fn) {
      var colShape = this._createShape(descriptor.shape),
          origin = this.tmpVec[0],
          rotation = this.tmpQuaternion[0],
          ghostObject;

      if (!colShape) {
        return console.error('Invalid collision shape!');
      }

      this.tmpTrans[0].setIdentity();

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      this.tmpTrans[0].setOrigin(origin);
      this.tmpTrans[0].setRotation(rotation);

      ghostObject = new Ammo.btPairCachingGhostObject();
      ghostObject.setWorldTransform(this.tmpTrans[0]);

      ghostObject.setCollisionShape(colShape);
      ghostObject.setCollisionFlags(this.collisionFlags.CF_NO_CONTACT_RESPONSE); // no collision response 

      var idx = this.ghosts.push(ghostObject) - 1;
      ghostObject.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    KinematicCharacterController_create: function(descriptor, fn) {
      var colShape,
          startTransform = this.tmpTrans[0],
          origin = this.tmpVec[1],
          rotation = this.tmpQuaternion[0],
          ghost,
          controller;

      startTransform.setIdentity();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
      }

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      startTransform.setOrigin(origin);
      startTransform.setRotation(rotation);

      ghost = new Ammo.btPairCachingGhostObject();
      ghost.setWorldTransform(startTransform);

      ghost.setCollisionShape(colShape);
      ghost.setCollisionFlags(this.collisionFlags.CF_CHARACTER_OBJECT);

      controller = new Ammo.btKinematicCharacterController (ghost, colShape, descriptor.stepHeight);

      this.dynamicsWorld.addCollisionObject(ghost, this.collisionFilterGroups.CharacterFilter,
        this.collisionFilterGroups.StaticFilter | this.collisionFilterGroups.DefaultFilter);

      this.dynamicsWorld.addAction(controller);

      var idx = this.characterControllers.push(controller) - 1;
      this.ghost = ghost;
      controller.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    KinematicCharacterController_setWalkDirection: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        this.tmpVec[0].setX(descriptor.direction.x);
        this.tmpVec[0].setY(descriptor.direction.y);
        this.tmpVec[0].setZ(descriptor.direction.z);

        controller.setWalkDirection(this.tmpVec[0]);
      }
    },

    KinematicCharacterController_jump: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.jump();
      }
    },

    KinematicCharacterController_setJumpSpeed: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setJumpSpeed(descriptor.jumpSpeed);
      }
    },

    KinematicCharacterController_setFallSpeed: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setFallSpeed(descriptor.fallSpeed);
      }
    },

    KinematicCharacterController_setMaxJumpHeight: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setMaxJumpHeight(descriptor.maxJumpHeight);
      }
    },

    KinematicCharacterController_setGravity: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setGravity(descriptor.gravity);
      }
    },

    KinematicCharacterController_setUpAxis: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setUpAxis(descriptor.upAxis);
      }
    },

    KinematicCharacterController_setVelocityForTimeInterval: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        this.tmpVec[0].setX(descriptor.velocity.x);
        this.tmpVec[0].setY(descriptor.velocity.y);
        this.tmpVec[0].setZ(descriptor.velocity.z);

        controller.setVelocityForTimeInterval(this.tmpVec[0], descriptor.interval);
      }
    },

    KinematicCharacterController_setUseGhostSweepTest: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setUseGhostSweepTest(descriptor.useGhostSweepTest);
      }
    },

    KinematicCharacterController_setMaxSlope: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        controller.setMaxSlope(descriptor.slopeRadians);
      }
    },

    KinematicCharacterController_warp: function(descriptor) {
      var controller = this.characterControllers[descriptor.controllerId];

      if (controller) {
        this.tmpVec[0].setX(descriptor.origin.x);
        this.tmpVec[0].setY(descriptor.origin.y);
        this.tmpVec[0].setZ(descriptor.origin.z);

        controller.warp(this.tmpVec[0]);
      }
    },

    RigidBody_create: function(descriptor, fn) {
      var colShape,
          startTransform = this.tmpTrans[0],
          isDynamic = (descriptor.mass !== 0),
          localInertia = this.tmpVec[0],
          origin = this.tmpVec[1],
          rotation = this.tmpQuaternion[0],
          myMotionState,
          rbInfo,
          body;

      startTransform.setIdentity();
      localInertia.setZero();

      colShape = this._createShape(descriptor.shape);

      if (!colShape) {
        throw('Invalid collision shape!');
      }

      if (isDynamic) {
        colShape.calculateLocalInertia(descriptor.mass,localInertia);
      }

      origin.setX(descriptor.position.x);
      origin.setY(descriptor.position.y);
      origin.setZ(descriptor.position.z);

      rotation.setX(descriptor.quaternion.x);
      rotation.setY(descriptor.quaternion.y);
      rotation.setZ(descriptor.quaternion.z);
      rotation.setW(descriptor.quaternion.w);

      startTransform.setOrigin(origin);
      startTransform.setRotation(rotation);

      myMotionState = new Ammo.btDefaultMotionState(startTransform);
      rbInfo = new Ammo.btRigidBodyConstructionInfo(descriptor.mass, myMotionState, colShape, localInertia);
      body = new Ammo.btRigidBody(rbInfo);

      var idx = this.bodies.push(body) - 1;
      body.id = idx;

      if (typeof fn === 'function') {
        fn(idx);
      }
    },

    RigidBody_setType: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        switch (descriptor.type) {
        case 'static':
          body.setCollisionFlags(this.collisionFlags.CF_STATIC_OBJECT);
          body.setActivationState(this.activationStates.DISABLE_SIMULATION);
          break;
        case 'kinematic':
          body.setCollisionFlags(this.collisionFlags.CF_KINEMATIC_OBJECT);
          body.setActivationState(this.activationStates.DISABLE_DEACTIVATION);
          break;
        default:
          console.warn('unknown body type: ' + descriptor.type + ', defaulting to dynamic');
          body.setCollisionFlags(0);
          break;
        case 'dynamic':
          body.setCollisionFlags(0);
          break;
        }
      }
    },

    RigidBody_setWorldTransform: function(descriptor) {
      var body = this.bodies[descriptor.bodyId],
          position,
          rotation;
      
      if (body) {
        this.tmpTrans[0].setIdentity();
        body.getMotionState().getWorldTransform(this.tmpTrans[0]);
        position = this.tmpTrans[0].getOrigin();
        rotation = this.tmpTrans[0].getRotation();

        if (descriptor.position) {
          position.setX(descriptor.position.x);
          position.setY(descriptor.position.y);
          position.setZ(descriptor.position.z);
        }

        if (descriptor.rotation) {
          rotation.setX(descriptor.rotation.x);
          rotation.setY(descriptor.rotation.y);
          rotation.setZ(descriptor.rotation.z);
          rotation.setW(descriptor.rotation.w);
        }

        if (body.isKinematicObject()) {
          body.getMotionState().setWorldTransform(this.tmpTrans[0]);
        } else {
          body.setWorldTransform(this.tmpTrans[0]);
        }
      }
    },

    RigidBody_clearForces: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        body.clearForces();
        body.activate();
      }
    },

    RigidBody_applyForce: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyForce(this.tmpVec[0], this.tmpVec[1]);
        body.activate();
      } 
    },

    RigidBody_applyCentralForce: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralForce(this.tmpVec[0]);
        body.activate();
      } 
    },

    RigidBody_applyImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.impulse.x);
        this.tmpVec[0].setY(descriptor.impulse.y);
        this.tmpVec[0].setZ(descriptor.impulse.z);
        this.tmpVec[1].setX(descriptor.relativePosition.x);
        this.tmpVec[1].setY(descriptor.relativePosition.y);
        this.tmpVec[1].setZ(descriptor.relativePosition.z);

        body.applyImpulse(this.tmpVec[0], this.tmpVec[1]);
        body.activate();
      } 
    },

    RigidBody_applyCentralImpulse: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.force.x);
        this.tmpVec[0].setY(descriptor.force.y);
        this.tmpVec[0].setZ(descriptor.force.z);

        body.applyCentralImpulse(this.tmpVec[0]);
        body.activate();
      } 
    },

    RigidBody_applyTorque: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];
      
      if (body) {
        this.tmpVec[0].setX(descriptor.torque.x);
        this.tmpVec[0].setY(descriptor.torque.y);
        this.tmpVec[0].setZ(descriptor.torque.z);
        
        body.applyTorque(this.tmpVec[0]);
        body.activate();
      }
    },

    RigidBody_setRestitution: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setRestitution(descriptor.restitution);
      }
    },

    RigidBody_setFriction: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setFriction(descriptor.friction);
      }
    },

    RigidBody_setDamping: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        body.setDamping(descriptor.linearDamping, descriptor.angularDamping);
      }
    },

    RigidBody_setLinearFactor: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.linearFactor.x); 
        this.tmpVec[0].setY(descriptor.linearFactor.y); 
        this.tmpVec[0].setZ(descriptor.linearFactor.z); 
        body.setLinearFactor(this.tmpVec[0]);
      }
    },

    RigidBody_setAngularFactor: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.angularFactor.x); 
        this.tmpVec[0].setY(descriptor.angularFactor.y); 
        this.tmpVec[0].setZ(descriptor.angularFactor.z); 
        body.setAngularFactor(this.tmpVec[0]);
      }
    },

    RigidBody_setLinearVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.linearVelocity.x); 
        this.tmpVec[0].setY(descriptor.linearVelocity.y); 
        this.tmpVec[0].setZ(descriptor.linearVelocity.z); 
        body.setLinearVelocity(this.tmpVec[0]);
      }
    },

    RigidBody_setAngularVelocity: function(descriptor) {
      var body = this.bodies[descriptor.bodyId];

      if (body) {
        this.tmpVec[0].setX(descriptor.angularVelocity.x); 
        this.tmpVec[0].setY(descriptor.angularVelocity.y); 
        this.tmpVec[0].setZ(descriptor.angularVelocity.z); 
        body.setAngularVelocity(this.tmpVec[0]);
      }
    },

    Constraint_destroy: function(id) {
      var constraint = this.constraints[id];

      if (constraint) {
        this.dynamicsWorld.removeConstraint(constraint);
        Ammo.destroy(constraint);
        this.constraints[id] = undefined;
        this.trigger('Constraint_destroy', id);
      }
    },

    RigidBody_destroy: function(id) {
      var body = this.bodies[id];

      if (body) {
        this.dynamicsWorld.removeRigidBody(body);
        Ammo.destroy(body);
        this.bodies[id] = undefined;
        this.trigger('RigidBody_destroy', id);
      }
    },

    Vehicle_destroy: function(id) {
      var vehicle = this.vehicles[id];

      if (vehicle) {
        this.dynamicsWorld.removeVehicle(vehicle);
        Ammo.destroy(vehicle);
        this.vehicles[id] = undefined;
        this.trigger('Vehicle_destroy', id);
      }
    },

    GhostObject_destroy: function(id) {
      var ghost = this.ghosts[id];

      if (ghost) {
        this.dynamicsWorld.removeCollisionObject(ghost);
        Ammo.destroy(ghost);
        this.ghosts[id] = undefined;
        this.trigger('GhostObject_destroy', id);
      }
    },

    shutdown: function() {
      Ammo.destroy(this.collisionConfiguration);
      Ammo.destroy(this.dispatcher);
      Ammo.destroy(this.overlappingPairCache);
      Ammo.destroy(this.solver);
    }
  };

  return AmmoWorkerAPI;
});

// This event system code is borrowed from the backbone project, http://backbonejs.org
define('vendor/backbone.events',['underscore'], function(_) {
  //     Backbone.js 1.1.0

  //     (c) 2010-2011 Jeremy Ashkenas, DocumentCloud Inc.
  //     (c) 2011-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
  //     Backbone may be freely distributed under the MIT license.
  //     For all details and documentation:
  //     http://backbonejs.org

  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  return Events;
});

define('ammo_base_object',[ 'underscore', 'vendor/backbone.events' ], function(_, Events) {
  function AmmoBaseObject() {
  }

  _.extend(AmmoBaseObject.prototype, Events);

  return AmmoBaseObject;  
});

define('ammo_rigid_body',[ './ammo_base_object' ], function(AmmoBaseObject) {
  function AmmoRigidBody(proxy, bodyId) {
    this.proxy = proxy;
    this.bodyId = bodyId;
    this.binding = undefined;
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    this.linearVelocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
  } 

  AmmoRigidBody.prototype = new AmmoBaseObject();

  AmmoRigidBody.prototype.update = function() {
    if (this.binding && this.binding.update) {
      this.binding.update();
    }
  };

  AmmoRigidBody.prototype.setType = function(type) {
    return this.proxy.execute('RigidBody_setType', {
      bodyId: this.bodyId,
      type: type
    });
  };

  AmmoRigidBody.prototype.setDamping = function(linearDamping, angularDamping) {
    return this.proxy.execute('RigidBody_setDamping', {
      bodyId: this.bodyId,
      linearDamping: linearDamping,
      angularDamping: angularDamping
    });
  };

  AmmoRigidBody.prototype.applyTorque = function(torque) {
    return this.proxy.execute('RigidBody_applyTorque', {
      bodyId: this.bodyId,
      torque: {
        x: torque.x,
        y: torque.y,
        z: torque.z
      }
    });
  };

  AmmoRigidBody.prototype.applyForce = function(force, relativePosition) {
    return this.proxy.execute('RigidBody_applyForce', {
      bodyId: this.bodyId,
      force: force,
      relativePosition: relativePosition || { x: 0, y: 0, z: 0 }
    });
  };

  AmmoRigidBody.prototype.applyCentralForce = function(force) {
    return this.proxy.execute('RigidBody_applyCentralForce', {
      bodyId: this.bodyId,
      force: {
        x: force.x,
        y: force.y,
        z: force.z
      }
    });
  };

  AmmoRigidBody.prototype.applyImpulse = function(impulse, relativePosition) {
    return this.proxy.execute('RigidBody_applyImpulse', {
      bodyId: this.bodyId,
      impulse: {
        x: impulse.x,
        y: impulse.y,
        z: impulse.z
      },
      relativePosition: relativePosition && {
        x: relativePosition.x,
        y: relativePosition.y,
        z: relativePosition.z
      } || { x: 0, y: 0, z: 0 }
    });
  };

  AmmoRigidBody.prototype.applyCentralImpulse = function(impulse) {
    return this.proxy.execute('RigidBody_applyCentralImpulse', {
      bodyId: this.bodyId,
      impulse: {
        x: impulse.x,
        y: impulse.y,
        z: impulse.z
      }
    });
  };

  AmmoRigidBody.prototype.setFriction = function(friction) {
    return this.proxy.execute('RigidBody_setFriction', {
      bodyId: this.bodyId,
      friction: friction
    });
  };

  AmmoRigidBody.prototype.setRestitution = function(restitution) {
    return this.proxy.execute('RigidBody_setRestitution', {
      bodyId: this.bodyId,
      restitution: restitution
    });
  };

  AmmoRigidBody.prototype.setLinearFactor = function(linearFactor) {
    return this.proxy.execute('RigidBody_setLinearFactor', {
      bodyId: this.bodyId,
      linearFactor: {
        x: linearFactor.x,
        y: linearFactor.y,
        z: linearFactor.z
      }
    });
  };

  AmmoRigidBody.prototype.setAngularFactor = function(angularFactor) {
    return this.proxy.execute('RigidBody_setAngularFactor', {
      bodyId: this.bodyId,
      angularFactor: {
        x: angularFactor.x,
        y: angularFactor.y,
        z: angularFactor.z
      }
    });
  };

  AmmoRigidBody.prototype.setLinearVelocity = function(linearVelocity) {
    return this.proxy.execute('RigidBody_setLinearVelocity', {
      bodyId: this.bodyId,
      linearVelocity: {
        x: linearVelocity.x,
        y: linearVelocity.y,
        z: linearVelocity.z
      }
    });
  };

  AmmoRigidBody.prototype.setAngularVelocity = function(angularVelocity) {
    return this.proxy.execute('RigidBody_setAngularVelocity', {
      bodyId: this.bodyId,
      angularVelocity: {
        x: angularVelocity.x,
        y: angularVelocity.y,
        z: angularVelocity.z
      }
    });
  };


  AmmoRigidBody.prototype.destroy = function() {
    var deferred = this.proxy.execute('RigidBody_destroy', { bodyId: this.bodyId });

    this.bodyId = undefined;

    this.binding.destroy();

    return deferred;
  };


  AmmoRigidBody.prototype.addToWorld = function(group, mask) {
    return this.proxy.execute('DynamicsWorld_addRigidBody', {
      bodyId: this.bodyId,
      group: group,
      mask: mask
    });
  };

  AmmoRigidBody.prototype.setWorldTransform = function(position, rotation) {
    return this.proxy.execute('RigidBody_setWorldTransform', {
      bodyId: this.bodyId,
      position: position,
      rotation: rotation
    });
  };

  AmmoRigidBody.prototype.clearForces = function() {
    return this.proxy.execute('RigidBody_clearForces', {
      bodyId: this.bodyId
    });
  };

  return AmmoRigidBody;
});

define('ammo_vehicle',[ 'underscore' ],function(_) {
  function AmmoVehicle(proxy, vehicleId, rigidBody) {
    this.proxy = proxy;
    this.vehicleId = vehicleId;
    this.wheelBindings = [];
    this.rigidBody = rigidBody;
  } 

  AmmoVehicle.prototype.addWheel = function(connectionPoint, wheelDirection, wheelAxle, 
      suspensionRestLength, wheelRadius, isFrontWheel, tuning) {

    var descriptor = {
      vehicleId: this.vehicleId,
      connectionPoint: connectionPoint,
      wheelDirection: wheelDirection,
      wheelAxle: wheelAxle,
      suspensionRestLength: suspensionRestLength,
      wheelRadius: wheelRadius,
      isFrontWheel: isFrontWheel,
      tuning: tuning
    };

    return this.proxy.execute('Vehicle_addWheel', descriptor);
  };

  AmmoVehicle.prototype.setWheelInfo = function(wheelIndex, properties) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      properties: properties
    };

    return this.proxy.execute('Vehicle_setWheelInfo', descriptor);
  };

  AmmoVehicle.prototype.setBrake = function(wheelIndex, brake) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      brake: brake
    };

    return this.proxy.execute('Vehicle_setBrake', descriptor);
  };

  AmmoVehicle.prototype.applyEngineForce = function(wheelIndex, force) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      force: force
    };

    return this.proxy.execute('Vehicle_applyEngineForce', descriptor);
  };

  AmmoVehicle.prototype.setSteeringValue = function(wheelIndex, steeringValue) {
    var descriptor = {
      vehicleId: this.vehicleId,
      wheelIndex: wheelIndex,
      steeringValue: steeringValue
    };

    return this.proxy.execute('Vehicle_setSteeringValue', descriptor);
  };

  AmmoVehicle.prototype.destroy = function() {
    var descriptor = {
      vehicleId: this.vehicleId
    };

    _.each(this.wheelBindings, function(binding) {
      binding.destroy();
    });

    this.rigidBody.destroy();

    return this.proxy.execute('Vehicle_destroy', descriptor);
  };

  AmmoVehicle.prototype.addWheelObject = function(wheelIndex, object) {
    this.wheelBindings[wheelIndex] = this.proxy.adapter.createBinding(object, 
        this.proxy.getWheelOffset(this.vehicleId, wheelIndex));  
  };

  AmmoVehicle.prototype.update = function() {
    if (this.rigidBody) {
      this.rigidBody.update();
    }

    _.each(this.wheelBindings, function(binding) {
      binding.update();
    });
  };

  return AmmoVehicle;
});

define('ammo_point2point_constraint',[], function() {
  function AmmoPoint2PointConstraint(proxy, constraintId) {
    this.proxy = proxy;
    this.constraintId = constraintId;
  } 

  return AmmoPoint2PointConstraint;
});

define('ammo_hinge_constraint',[], function() {
  function AmmoHingeConstraint(proxy, constraintId) {
    this.proxy = proxy;
    this.constraintId = constraintId;
  } 

  AmmoHingeConstraint.prototype.setLimit = function(low, high, softness, biasFactor, relaxationFactor) {
    var descriptor = {
      constraintId: this.constraintId,
      low: low,
      high: high,
      softness: softness,
      biasFactor: biasFactor,
      relaxationFactor: relaxationFactor
    };

    return this.proxy.execute('HingeConstraint_setLimit', descriptor);
  };

  return AmmoHingeConstraint;
});

define('ammo_slider_constraint',[], function() {
  function AmmoSliderConstraint(proxy, constraintId) {
    this.proxy = proxy;
    this.constraintId = constraintId;
  } 

  AmmoSliderConstraint.prototype.setLowerLinLimit = function(limit) {
    return this.proxy.execute('SliderConstraint_setLowerLinLimit', {
      constraintId: this.constraintId,
      limit: limit
    });
  };

  AmmoSliderConstraint.prototype.setUpperLinLimit = function(limit) {
    return this.proxy.execute('SliderConstraint_setUpperLinLimit', {
      constraintId: this.constraintId,
      limit: limit
    });
  };

  AmmoSliderConstraint.prototype.setLowerAngLimit = function(limit) {
    return this.proxy.execute('SliderConstraint_setLowerAngLimit', {
      constraintId: this.constraintId,
      limit: limit
    });
  };

  AmmoSliderConstraint.prototype.setUpperAngLimit = function(limit) {
    return this.proxy.execute('SliderConstraint_setUpperAngLimit', {
      constraintId: this.constraintId,
      limit: limit
    });
  };

  return AmmoSliderConstraint;
});

define('ammo_ghost_object',[ './ammo_base_object' ], function(AmmoBaseObject) {
  function AmmoGhostObject(proxy, ghostId) {
    this.proxy = proxy;
    this.ghostId = ghostId;
  }

  AmmoGhostObject.prototype = new AmmoBaseObject();

  AmmoGhostObject.prototype.addToWorld = function(group, mask) {
    return this.proxy.execute('DynamicsWorld_addGhostObject', {
      ghostId: this.ghostId,
      group: group,
      mask: mask
    });
  };

  AmmoGhostObject.prototype.destroy = function() {
    return this.proxy.execute('GhostObject_destroy', {
      ghostId: this.ghostId
    });
  };

  AmmoGhostObject.prototype.update = function() {
    if (this.binding && this.binding.update) {
      this.binding.update();
    }
  };

  return AmmoGhostObject;
});

define('ammo_kinematic_character_controller',[ './ammo_base_object' ], function(AmmoBaseObject) {
  function AmmoKinematicCharacterController(proxy, controllerId) {
    this.proxy = proxy;
    this.controllerId = controllerId;
    this.binding = undefined;
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    this.linearVelocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
  } 

  AmmoKinematicCharacterController.prototype = new AmmoBaseObject();

  AmmoKinematicCharacterController.prototype.update = function() {
    if (this.binding && this.binding.update) {
      this.binding.update();
    }
  };

  AmmoKinematicCharacterController.prototype.setWalkDirection = function(direction) {
    return this.proxy.execute('KinematicCharacterController_setWalkDirection', {
      controllerId: this.controllerId,
      direction: direction
    });
  };

  AmmoKinematicCharacterController.prototype.setJumpSpeed = function(jumpSpeed) {
    return this.proxy.execute('KinematicCharacterController_setJumpSpeed', {
      controllerId: this.controllerId,
      jumpSpeed: jumpSpeed
    });
  };

  AmmoKinematicCharacterController.prototype.setFallSpeed = function(fallSpeed) {
    return this.proxy.execute('KinematicCharacterController_setFallSpeed', {
      controllerId: this.controllerId,
      fallSpeed: fallSpeed
    });
  };

  AmmoKinematicCharacterController.prototype.setMaxJumpHeight = function(maxJumpHeight) {
    return this.proxy.execute('KinematicCharacterController_setMaxJumpHeight', {
      controllerId: this.controllerId,
      maxJumpHeight: maxJumpHeight
    });
  };

  AmmoKinematicCharacterController.prototype.setGravity = function(gravity) {
    return this.proxy.execute('KinematicCharacterController_setGravity', {
      controllerId: this.controllerId,
      gravity: gravity
    });
  };

  AmmoKinematicCharacterController.prototype.setUpAxis = function(upAxis) {
    return this.proxy.execute('KinematicCharacterController_setUpAxis', {
      controllerId: this.controllerId,
      upAxis: upAxis
    });
  };

  AmmoKinematicCharacterController.prototype.jump = function() {
    return this.proxy.execute('KinematicCharacterController_jump', {
      controllerId: this.controllerId
    });
  };

  AmmoKinematicCharacterController.prototype.setVelocityForTimeInterval = function(velocity, interval) {
    return this.proxy.execute('KinematicCharacterController_setVelocityForTimeInterval', {
      controllerId: this.controllerId,
      velocity: velocity,
      interval: interval
    });
  };

  AmmoKinematicCharacterController.prototype.setUseGhostSweepTest = function(useGhostSweepTest) {
    return this.proxy.execute('KinematicCharacterController_setUseGhostSweepTest', {
      controllerId: this.controllerId,
      useGhostSweepTest: useGhostSweepTest
    });
  };

  AmmoKinematicCharacterController.prototype.setMaxSlope = function(slopeRadians) {
    return this.proxy.execute('KinematicCharacterController_setMaxSlope', {
      controllerId: this.controllerId,
      slopRadians: slopeRadians
    });
  };

  AmmoKinematicCharacterController.prototype.warp = function(origin) {
    return this.proxy.execute('KinematicCharacterController_warp', {
      controllerId: this.controllerId,
      origin: origin
    });
  };

  return AmmoKinematicCharacterController;
});

define('three/three_binding',[], function() {
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

  THREEBinding.prototype.destroy = function() {
    this.object = undefined;
    this.offset = undefined;
  };

  return THREEBinding;
});

define('three/three_adapter',[ 'underscore', 'three/three_binding' ], function(_, THREEBinding) {
  function THREEAdapter(proxy) {
    this.proxy  = proxy;
  }

  THREEAdapter.prototype.createBinding = function(object, offset) {
    return new THREEBinding(this.proxy, object, offset);
  };

  THREEAdapter.prototype.createRigidBodyFromObject = function(object, mass, shape) {
    if (!shape) {
      shape = this._getShapeJSON(object);
    } else if (shape.shape === 'auto') {
      shape = this._getShapeJSON(object, { strategy: shape.strategy });
    }

    var position = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      quaternion = {
        x: object.quaternion.x,
        y: object.quaternion.y,
        z: object.quaternion.z,
        w: object.quaternion.w
      };

    var deferred = this.proxy.createRigidBody(shape, mass, position, quaternion);

    deferred.then(_.bind(function(rigidBody) {
      rigidBody.binding = this.createBinding(object, this.proxy.getRigidBodyOffset(rigidBody.bodyId));
    }, this));

    return deferred;
  };

  THREEAdapter.prototype.createKinematicCharacterControllerFromObject = function(object, shape, stepHeight) {
    if (!shape) {
      shape = this._getShapeJSON(object);
    } else if (shape.shape === 'auto') {
      shape = this._getShapeJSON(object, { strategy: shape.strategy });
    }

    var position = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      quaternion = {
        x: object.quaternion.x,
        y: object.quaternion.y,
        z: object.quaternion.z,
        w: object.quaternion.w
      };

    var deferred = this.proxy.createKinematicCharacterController(shape, position, quaternion, stepHeight);

    deferred.then(_.bind(function(kinematicCharacterController) {
      kinematicCharacterController.binding = this.createBinding(object, this.proxy.getKinematicCharacterControllerOffset(kinematicCharacterController.controllerId));
    }, this));

    return deferred;
  };

  THREEAdapter.prototype.createGhostObjectFromObject = function(object, shape) {
    if (!shape) {
      shape = this._getShapeJSON(object);
    } else if (shape.shape === 'auto') {
      shape = this._getShapeJSON(object, { strategy: shape.strategy });
    }

    var position = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      quaternion = {
        x: object.quaternion.x,
        y: object.quaternion.y,
        z: object.quaternion.z,
        w: object.quaternion.w
      };

    var deferred = this.proxy.createGhostObject(shape, position, quaternion);

    deferred.then(_.bind(function(ghostObject) {
      ghostObject.binding = this.createBinding(object, this.proxy.getGhostObjectOffset(ghostObject.ghostId));
    }, this));

    return deferred;
  };

  THREEAdapter.prototype._getShapeJSON = function(o, opts) {
    opts = opts || {};
    opts.strategy = opts.strategy || 'convex_hull_mesh';

    switch(opts.strategy) {
    case 'compound_bounding_box':
      return this._createBoundingBoxCompoundShape(o);

    case 'bvh_triangle_mesh':
      return this._createBvhTriangleMeshShape(o);

    case 'convex_triangle_mesh':
      return this._createConvexTriangleMeshShape(o);

    case 'convex_hull_mesh':
      return this._createConvexHullMeshShape(o);

    default:
      throw new Error('Unknown strategy: ' + opts.strategy);
    }
  };

  THREEAdapter.prototype._createConvexTriangleMeshShape = function(o) {
    var json = {
      'shape': 'convex_triangle_mesh',
      'triangles': []
    };

    return this._createTriangleMeshShape(o, json);
  };

  THREEAdapter.prototype._createBvhTriangleMeshShape = function(o) {
    var json = {
      'shape': 'bvh_triangle_mesh',
      'triangles': []
    };

    return this._createTriangleMeshShape(o, json);
  };

  THREEAdapter.prototype._createBoundingBoxCompoundShape = function(o) {
    var inverseParent = new THREE.Matrix4(),
        tmpMatrix = new THREE.Matrix4();

    var json = {
      'shape': 'compound',
      'children': [
      ]
    };

    inverseParent.getInverse(o.matrixWorld);

    o.traverse(function(o) {
      if (o instanceof THREE.Mesh && !o.isBB) {
        var min, max, halfExtents = new THREE.Vector3(),
        position = new THREE.Vector3(),
        rotation = new THREE.Quaternion(),
        scale = new THREE.Vector3();

        scale.getScaleFromMatrix(o.matrixWorld);

        tmpMatrix.copy(inverseParent);
        tmpMatrix.multiply(o.matrixWorld);

        position.getPositionFromMatrix(tmpMatrix);
        tmpMatrix.extractRotation(tmpMatrix);
        rotation.setFromRotationMatrix(tmpMatrix);

        o.geometry.computeBoundingBox();
        min = o.geometry.boundingBox.min.clone();
        max = o.geometry.boundingBox.max.clone();

        halfExtents.subVectors(max, min);
        halfExtents.multiplyScalar(0.5);

        halfExtents.multiplyVectors(halfExtents, scale);

        var center = new THREE.Vector3();
        center.x = ( min.x + max.x ) / 2;
        center.y = ( min.y + max.y ) / 2;
        center.z = ( min.z + max.z ) / 2;
        center.multiplyVectors(center, scale);

        json.children.push({
          shape: 'box',
          halfExtents: {
            x: halfExtents.x,
            y: halfExtents.y,
            z: halfExtents.z
          },
          localTransform: {
            position: {
              x: position.x,
              y: position.y,
              z: position.z
            },
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z,
              w: rotation.w
            }
          }
        });
      }
    });
    return json;
  };

  THREEAdapter.prototype._createConvexHullMeshShape = function(o) {
    var json = {
      shape: 'convex_hull_mesh',
      vertices: []
    },
    idx = 0;

    var inverseParent = new THREE.Matrix4(),
        tmpMatrix = new THREE.Matrix4();
        
    inverseParent.getInverse(o.matrixWorld);

    o.traverse(function(child) {
      var geometry = child.geometry,
          scale = new THREE.Vector3(),
          tmpVector3 = new THREE.Vector3(),
          i;

      tmpMatrix.copy(inverseParent);
      tmpMatrix.multiply(child.matrixWorld);

      if (child instanceof THREE.Mesh && !child.isBB) {
        scale.getScaleFromMatrix(child.matrixWorld);

        if (geometry instanceof THREE.BufferGeometry) {
          if (!geometry.attributes.position.array) {
            return console.warn('BufferGeometry has no position attribute. Was it unloaded?');
          }

          var positions = geometry.attributes.position.array;

          for (i = 0; i < positions.length; i += 3) {
            tmpVector3.x = positions[ i + 0 ];
            tmpVector3.y = positions[ i + 1];
            tmpVector3.z = positions[ i + 2];

            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.vertices[idx * 9 + 0] = tmpVector3.x;
            json.vertices[idx * 9 + 1] = tmpVector3.y;
            json.vertices[idx * 9 + 2] = tmpVector3.z;

            idx ++;
          }
        } else if (geometry instanceof THREE.Geometry) {
          for (i = 0; i < geometry.vertices.length; i++ ) {
            tmpVector3.copy(geometry.vertices[i]);
            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.vertices[idx * 3 + 0] = tmpVector3.x;
            json.vertices[idx * 3 + 1] = tmpVector3.y;
            json.vertices[idx * 3 + 2] = tmpVector3.z;

            idx++;
          }
        }
      }
    });

    return json;
  };

  THREEAdapter.prototype._createTriangleMeshShape = function(o, json) {
    var inverseParent = new THREE.Matrix4(),
        tmpMatrix = new THREE.Matrix4(),
        tmpVector3 = new THREE.Vector3(),
        mesh,
        geometry,
        i,
        idx = 0,
        face;

    inverseParent.getInverse(o.matrixWorld);

    o.traverse(function(child) {
      if (child instanceof THREE.Mesh && !child.isBB) {
        geometry = child.geometry;
        mesh = child;

        tmpMatrix.copy(inverseParent);
        tmpMatrix.multiply(child.matrixWorld);

        if (geometry instanceof THREE.BufferGeometry) {
          if (!geometry.attributes.position.array) {
            return console.warn('BufferGeometry has no position attribute. Was it unloaded?');
          }
          var positions = geometry.attributes.position.array;
          var vA, vB, vC;
          var indices = geometry.attributes.index.array;
          var offsets = geometry.offsets;
          var il;

          for (var j = 0, jl = offsets.length; j < jl; ++ j ) {
            var start = offsets[ j ].start;
            var count = offsets[ j ].count;
            var index = offsets[ j ].index;

            for (i = start, il = start + count; i < il; i += 3 ) {
              vA = index + indices[ i + 0 ];
              vB = index + indices[ i + 1 ];
              vC = index + indices[ i + 2 ];
              tmpVector3.x = positions[ vA * 3 ];
              tmpVector3.y = positions[ vA * 3 + 1];
              tmpVector3.z = positions[ vA * 3 + 2];

              tmpVector3.applyMatrix4(tmpMatrix);
              tmpVector3.multiply(o.scale);

              json.triangles[idx * 9 + 0] = tmpVector3.x;
              json.triangles[idx * 9 + 1] = tmpVector3.y;
              json.triangles[idx * 9 + 2] = tmpVector3.z;

              tmpVector3.x = positions[ vB * 3 ];
              tmpVector3.y = positions[ vB * 3 + 1];
              tmpVector3.z = positions[ vB * 3 + 2];

              tmpVector3.applyMatrix4(tmpMatrix);
              tmpVector3.multiply(o.scale);

              json.triangles[idx * 9 + 3] = tmpVector3.x;
              json.triangles[idx * 9 + 4] = tmpVector3.y;
              json.triangles[idx * 9 + 5] = tmpVector3.z;

              tmpVector3.x = positions[ vC * 3 ];
              tmpVector3.y = positions[ vC * 3 + 1];
              tmpVector3.z = positions[ vC * 3 + 2];

              tmpVector3.applyMatrix4(tmpMatrix);
              tmpVector3.multiply(o.scale);

              json.triangles[idx * 9 + 6] = tmpVector3.x;
              json.triangles[idx * 9 + 7] = tmpVector3.y;
              json.triangles[idx * 9 + 8] = tmpVector3.z;

              idx ++;
            }
          }
        } else if (geometry instanceof THREE.Geometry) {
          for (i = 0; i < geometry.faces.length; i++) {
            face = geometry.faces[i];

            tmpVector3.copy(geometry.vertices[face.a]);
            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 0] = tmpVector3.x;
            json.triangles[idx * 9 + 1] = tmpVector3.y;
            json.triangles[idx * 9 + 2] = tmpVector3.z;

            tmpVector3.copy(geometry.vertices[face.b]);
            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 3] = tmpVector3.x;
            json.triangles[idx * 9 + 4] = tmpVector3.y;
            json.triangles[idx * 9 + 5] = tmpVector3.z;

            tmpVector3.copy(geometry.vertices[face.c]);
            tmpVector3.applyMatrix4(tmpMatrix);
            tmpVector3.multiply(o.scale);

            json.triangles[idx * 9 + 6] = tmpVector3.x;
            json.triangles[idx * 9 + 7] = tmpVector3.y;
            json.triangles[idx * 9 + 8] = tmpVector3.z;

            idx ++;
          }
        }
      }
    });

    return json;
  };

  return THREEAdapter;
});

define('ammo_proxy',[ 'when', 'underscore', 'ammo_worker_api', 'ammo_rigid_body', 'ammo_vehicle', 
         'ammo_point2point_constraint', 'ammo_hinge_constraint', 'ammo_slider_constraint',
         'ammo_ghost_object', 'ammo_kinematic_character_controller', 'three/three_adapter' ], 
      function(when, _, AmmoWorkerAPI, AmmoRigidBody, AmmoVehicle, AmmoPoint2PointConstraint,
        AmmoHingeConstraint, AmmoSliderConstraint, AmmoGhostObject, 
        AmmoKinematicCharacterController, THREEAdapter) {
  function AmmoProxy(opts) {
    var context = this, i, apiMethods = [
      'on', 'fire', 'setStep', 'setIterations', 'setGravity', 'startSimulation',
      'stopSimulation', 'getStats'
    ];

    opts = this.opts = opts || {};
    opts.gravity = opts.gravity || { x: 0, y: -9.82, z: 0};
    opts.iterations = opts.iterations || 10;
    opts.step = opts.step || 1/60;
    opts.maxBodies = opts.maxBodies || 1000;
    opts.maxVehicles = opts.maxVehicles || 32;
    opts.maxWheelsPerVehicle = opts.maxWheelsPerVehicle || 8;
    opts.maxKinematicCharacterControllers = opts.maxKinematicCharacterControllers || 16;
    opts.maxGhostObjects = opts.maxGhostObjects || 500;

    var bodies = this.bodies = [];
    var constraints = this.constraints = [];
    var vehicles = this.vehicles = [];
    var ghosts = this.ghosts = [];
    var kinematicCharacterControllers = this.kinematicCharacterControllers = [];

    this.adapter = new THREEAdapter(this);

    this.worker = cw(new AmmoWorkerAPI(opts));

    this.worker.on('update', _.bind(this.update, this));

    this.worker.on('error', function(err) {
      console.error(err.message);
    });

    this.worker.on('GhostObject_destroy', function(id) {
      ghosts[id] = undefined;
    });

    this.worker.on('RigidBody_destroy', function(id) {
      bodies[id] = undefined;
    });

    this.worker.on('Vehicle_destroy', function(id) {
      vehicles[id] = undefined;
    });

    this.worker.on('Constraint_destroy', function(id) {
      constraints[id] = undefined;
    });

    this.worker.on('KinematicCharacterController_destroy', function(id) {
      kinematicCharacterControllers[id] = undefined;
    });

    this.worker.on('ghost_enter', _.bind(function(descriptor) {
      var objA = this.getObjectByDescriptor(descriptor.objectA),
          objB = this.getObjectByDescriptor(descriptor.objectB);

      if (objA && _.isFunction(objA.trigger)) {
        objA.trigger('ghost_enter', objB, objA);
      }

      if (objB && _.isFunction(objB.trigger)) {
        objB.trigger('ghost_enter', objA, objB); 
      }
    }, this));

    this.worker.on('ghost_exit', _.bind(function(descriptor) {
      var objA = this.getObjectByDescriptor(descriptor.objectA),
          objB = this.getObjectByDescriptor(descriptor.objectB);

      objA.trigger('ghost_exit', objB, objA);
      objB.trigger('ghost_exit', objA, objB); 
    }, this));

    function proxyMethod(method) {
      context[method] = function() {
        return context.worker[method].apply(context.worker, arguments);
      };
    }

    for (i in apiMethods) {
      if (apiMethods.hasOwnProperty(i)) {
        proxyMethod(apiMethods[i]);
      }
    }

    this.setStep(opts.step);
    this.setIterations(opts.iterations);
    this.setGravity(opts.gravity);
  }

  AmmoProxy.prototype.getObjectByDescriptor = function(descriptor) {
    switch (descriptor.type) {
      case 'rigidBody':
        return this.bodies[descriptor.id];

      case 'ghost':
        return this.ghosts[descriptor.id];

      default:
        return console.error('unknown type: ', descriptor.type);
    }
  };

  AmmoProxy.prototype.execute = function(method, descriptor) {
    return this.worker[method](descriptor);
  };

  AmmoProxy.prototype.aabbTest = function(min, max) {
    return this.execute('Broadphase_aabbTest', { min: {
        x: min.x,
        y: min.y,
        z: min.z
      },
      max: {
        x: max.x,
        y: max.y,
        z: max.z
      }
    });
  };

  AmmoProxy.prototype.rayTestClosest = function(rayFromWorld, rayToWorld) {
    return this.execute('DynamicsWorld_rayTestClosest', {
      rayFromWorld: rayFromWorld,
      rayToWorld: rayToWorld
    });
  };

  /*
  AmmoProxy.prototype.rayTestAllHits = function(rayFromWorld, rayToWorld) {
    return this.execute('DynamicsWorld_rayTestAllHits', {
      rayFromWorld: rayFromWorld,
      rayToWorld: rayToWorld
    });
  };
  */

  AmmoProxy.prototype.createVehicle = function(rigidBody, tuning) {
    var descriptor = {
      bodyId: rigidBody instanceof AmmoRigidBody ? rigidBody.bodyId : rigidBody,
      tuning: tuning
    };

    var deferred = when.defer();

    this.worker.Vehicle_create(descriptor).then(_.bind(function(vehicleId) {
      var proxy = this;
      setTimeout(function() {
        var vehicle = new AmmoVehicle(proxy, vehicleId, rigidBody);
        proxy.vehicles[vehicleId] = vehicle;
        deferred.resolve(vehicle);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createGhostObject = function(shape, position, quaternion) {
    var descriptor = {
        shape: shape,
        position: position,
        quaternion: quaternion
      },
      deferred = when.defer();

    this.worker.GhostObject_create(descriptor).then(_.bind(function(ghostId) {
      var proxy = this;
      setTimeout(function() {
        var ghost = new AmmoGhostObject(proxy, ghostId); 
        proxy.ghosts[ghostId] = ghost;
        deferred.resolve(ghost);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createKinematicCharacterController = function(shape, position, quaternion, stepHeight) {
    var descriptor = {
        shape: shape,
        position: position,
        quaternion: quaternion,
        stepHeight: stepHeight
      },
      deferred = when.defer();

    this.worker.KinematicCharacterController_create(descriptor).then(_.bind(function(kinematicCharacterControllerId) {
      var proxy = this;
      setTimeout(function() {
        var controller = new AmmoKinematicCharacterController(proxy, kinematicCharacterControllerId); 
        proxy.kinematicCharacterControllers[kinematicCharacterControllerId] = controller;
        deferred.resolve(controller);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createRigidBody = function(shape, mass, position, quaternion) {
    var descriptor = {
        shape: shape,
        mass: mass,
        position: position,
        quaternion: quaternion
      },
      deferred = when.defer();

    this.worker.RigidBody_create(descriptor).then(_.bind(function(bodyId) {
      var proxy = this;
      setTimeout(function() {
        var body = new AmmoRigidBody(proxy, bodyId); 
        proxy.bodies[bodyId] = body;
        deferred.resolve(body);
      }, 0);
    }, this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createPoint2PointConstraint = function(bodyA, bodyB, pivotA, pivotB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,

        pivotA: { x: pivotA.x, y: pivotA.y, z: pivotA.z },
        pivotB: { x: pivotB.x, y: pivotB.y, z: pivotB.z }
      },
      deferred = when.defer();

    this.execute('Point2PointConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoPoint2PointConstraint(proxy, constraintId); 
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createSliderConstraint = function(bodyA, bodyB, frameInA, frameInB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,
        frameInA: {
          position: {
            x: frameInA.position.x,
            y: frameInA.position.y,
            z: frameInA.position.z
          },
          rotation: {
            x: frameInA.rotation.x,
            y: frameInA.rotation.y,
            z: frameInA.rotation.z,
            w: frameInA.rotation.w
          }
        },
        frameInB: {
          position: {
            x: frameInB.position.x,
            y: frameInB.position.y,
            z: frameInB.position.z
          },
          rotation: {
            x: frameInB.rotation.x,
            y: frameInB.rotation.y,
            z: frameInB.rotation.z,
            w: frameInB.rotation.w
          }
        }
      },
      deferred = when.defer();

    this.execute('SliderConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoSliderConstraint(proxy, constraintId); 
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.createHingeConstraint = function(bodyA, bodyB, pivotA, pivotB, axisA, axisB) {
    var descriptor = {
        rigidBodyIdA: bodyA.bodyId,
        rigidBodyIdB: bodyB.bodyId,
        pivotA: { x: pivotA.x, y: pivotA.y, z: pivotA.z },
        pivotB: { x: pivotB.x, y: pivotB.y, z: pivotB.z },
        axisA: { x: axisA.x, y: axisA.y, z: axisA.z },
        axisB: { x: axisB.x, y: axisB.y, z: axisB.z }
      },
      deferred = when.defer();

    this.execute('HingeConstraint_create', descriptor).then(_.bind(function(constraintId) {
      var proxy = this;
      setTimeout(function() {
        var constraint = new AmmoHingeConstraint(proxy, constraintId);
        proxy.constraints[constraintId] = constraint;
        deferred.resolve(constraint);
      }, 0);
    },this));

    return deferred.promise;
  };

  AmmoProxy.prototype.update = function(data) {
    if (this.next) {
      this.worker.swap(this.data && this.data.buffer);
      this.data = this.next;
    }
    this.next = new Float64Array(data);
  };

  AmmoProxy.prototype.createGhostObjectFromObject = function(object, shape) {
    return this.adapter.createGhostObjectFromObject(object, shape);
  };

  AmmoProxy.prototype.createRigidBodyFromObject = function(object, mass, shape) {
    return this.adapter.createRigidBodyFromObject(object, mass, shape); 
  };


  AmmoProxy.prototype.createKinematicCharacterControllerFromObject = function(object, shape, stepHeight) {
    return this.adapter.createKinematicCharacterControllerFromObject(object, shape, stepHeight);
  };

  AmmoProxy.prototype.getGhostObjectOffset = function(ghostObjectId) {
    return (this.opts.maxBodies * 7) + (this.opts.maxVehicles * 8 * 7) + (this.opts.maxKinematicCharacterControllers * 7) + (ghostObjectId * 7);
  };

  AmmoProxy.prototype.getRigidBodyOffset = function(bodyId) {
    return bodyId * 7;
  };

  AmmoProxy.prototype.getWheelOffset = function(vehicleId, wheelIndex) {
    return (this.opts.maxBodies * 7) + (vehicleId * 8 * 7) + (wheelIndex * 7);
  };

  AmmoProxy.prototype.getVehicle = function(vehicleId) {
    if (this.vehicles[vehicleId]) {
      return this.vehicles[vehicleId];
    }

    console.warn('Asked for non-existent vehicle with ID: ' + vehicleId);
  };

  AmmoProxy.prototype.getKinematicCharacterControllerOffset = function(kinematicCharacterControllerId) {
    return (this.opts.maxBodies * 7) + (this.opts.maxVehicles * 8 * 7) + (kinematicCharacterControllerId * 7);
  };

  AmmoProxy.prototype.getConstraint = function(constraintId) {
    if (this.constraints[constraintId]) {
      return this.constraints[constraintId];
    }

    console.warn('Asked for non-existent constraint with ID: ' + constraintId);
  };

  AmmoProxy.prototype.getRigidBody = function(rigidBodyId) {
    if (this.bodies[rigidBodyId]) {
      return this.bodies[rigidBodyId];
    }

    console.warn('Asked for non-existent rigid body with ID: ' + rigidBodyId);
  };

  AmmoProxy.prototype.getGhostObject = function(ghostObjectId) {
    if (this.ghosts[ghostObjectId]) {
      return this.ghosts[ghostObjectId];
    }

    console.warn('Asked for non-existent ghost object with ID: ' + ghostObjectId);
  };

  return AmmoProxy;
});
  return require('ammo_proxy');
}));
