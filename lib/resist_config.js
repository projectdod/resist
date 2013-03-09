"use strict";

var Gossiper = require('gossiper').Gossiper,
    ResistCrypt = require('./resist_crypt');

var DEFAULT_PORT = 80;

function ResistConfig(options, listenCallback) {
  if (false === (this instanceof ResistConfig)) {
    return new ResistConfig(options, listenCallback);
  }

  var self = this;

  this.port = options.port || DEFAULT_PORT;
  this.cache = options.cache || {};
  this.hostResistConfig = options.hostResistConfig || {};
  this.resistCrypt = options.resistCrypt || new ResistCrypt();

  // XXX: read seeds from a config file, and write new peers as we find them.
  // XXX: make sure to handle connection errors here.
  this.gossip = options.gossip || new Gossiper(7001, ['127.0.0.1:7000']);

  this.gossip.start(function () {
    if (listenCallback) {
      listenCallback.call(self);
    }
  });

  this.gossip.on('update', function(peer, key, value) {
    if (key !== '__heartbeat__') {
      var data = self.resistCrypt.decrypt(peer, key, value);

      if (self.resistCrypt.validate(peer, key, data)) {
        // XXX: add stats collection and logging here
        // console.log("CONFIG: peer " + peer + " set " + key + " to " + value);
        // console.log(value);
        self.setHost(key, data);
      }
    }
  });
}

// XXX: This should be a host get function
ResistConfig.prototype.getHost = function (host) {
  if (this.hostResistConfig[host]) {
    return this.hostResistConfig[host];
  } else {
    return null;
  }
};

// XXX: This should be a host set function
ResistConfig.prototype.setHost = function (host, configuration) {
  configuration = this.resistCrypt.sign(host, configuration);
  var ciphertext = this.resistCrypt.encrypt(host, configuration);
  this.hostResistConfig[host] = configuration;
  this.gossip.setLocalState(host, ciphertext);
};

// XXX: This should be a cache get function
ResistConfig.prototype.getCache = function () {
  if (this.cache) {
    return this.cache;
  } else {
    return null;
  }
};

// XXX: This should be a cache set function
ResistConfig.prototype.setCache = function (cache) {
  this.cache = cache;
};

// XXX: This should be the port get function
ResistConfig.prototype.getPort = function () {
  if (this.port) {
    return this.port;
  } else {
    return DEFAULT_PORT;
  }
};

// XXX: This should be the port set function
ResistConfig.prototype.setPort = function (port) {
  this.port = port;
};

// XXX: Make a user get function
// XXX: Make a user set function
// XXX: Make a peer get function
// XXX: Make a peer set function
ResistConfig.prototype.destroy = function () {
  this.gossip.stop();
};

module.exports = ResistConfig;
