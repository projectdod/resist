"use strict";

var Gossiper = require('gossiper').Gossiper,
    ResistCrypt = require('./resist_crypt');

var DEFAULT_PORT = 80;

function ResistConfig(opt, listenCallback) {
  if (false === (this instanceof ResistConfig)) {
    return new ResistConfig(opt, listenCallback);
  }

  var self = this;

  this.port             = opt.port || DEFAULT_PORT;
  this.cache            = opt.cache || {};
  this.hostResistConfig = opt.hostResistConfig || {};
  this.resistCrypt      = opt.resistCrypt || new ResistCrypt();
  this.gossip_port      = opt.gossip_port || 7001;
  this.gossip_hosts     = opt.gossip_hosts || [ '127.0.0.1:7000' ];
  this.gossip = opt.gossip || new Gossiper(this.gossip_port, this.gossip_hosts);

  this.hostResistConfig["__default__"] = null;

  this.gossip.start(function () {
    if (listenCallback) {
      listenCallback(self);
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
    return this.hostResistConfig["__default__"];
  }
};

// XXX: This should be a host set function
ResistConfig.prototype.setHost = function (host, config) {
  config = this.resistCrypt.sign(host, config);
  var ciphertext = this.resistCrypt.encrypt(host, config);
  this.hostResistConfig[host] = config;
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
