"use strict";

require("function-bind");

var Gossiper = require('gossiper').Gossiper;

function Config(listenCallback) {
  if (false === (this instanceof Config)) {
   return new Config(listenCallback);
  }

  // XXX: read seeds from a config file, and write new peers as we find them.
  this.gossip = new Gossiper(7001, ['127.0.0.1:7000'], '127.0.0.1');
  this.gossip.start(listenCallback);
  this.config = {};

  this.gossip.on('update', function(peer, key, value) {
    // XXX: validate the peer/data
    // console.log("peer " + peer + " set " + key + " to " + value);
    this.config[key] = value;
  }.bind(this));
}

Config.prototype.get = function (host) {
  if (this.config[host]) {
    return this.config[host];
  } else {
    return null;
  }
};

Config.prototype.destroy = function () {
  this.gossip.stop();
};

module.exports = Config;
