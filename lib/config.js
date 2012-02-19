"use strict";

require("function-bind");

var Gossiper = require('gossiper').Gossiper;

function Config(listenCallback) {
  if (false === (this instanceof Config )) {
   return new Config(listenCallback);
  }

  // XXX: read seeds from a config file, and write new peers as we find them.
  this.gossip = new Gossiper(i, ['127.0.0.1:7000']);
  this.gossip.start(listenCallback);

  this.gossip.on('update', function(peer, key, value) {
    // XXX: validate the peer/data
    console.log("peer " + peer + " set " + key + " to " + value);
    this.config = value;
  }).bind(this);
}

// just a stub for now.
Config.prototype.get = function (host) {
  if (this.config[host]) {
    return this.config[host];
  } else {
    return null;
  }
};

exports = Config;
