"use strict";

var Gossiper = require('gossiper').Gossiper,
    ResistCrypt = require('resist_crypt');

function Config(listenCallback) {
  if (false === (this instanceof Config)) {
    return new Config(listenCallback);
  }

  this.resistCrypt = new ResistCrypt();

  // XXX: read seeds from a config file, and write new peers as we find them.
  // XXX: make sure to handle connection errors here.
  this.gossip = new Gossiper(7001, ['127.0.0.1:7000']);
  this.gossip.start(listenCallback);
  this.config = {};

  this.gossip.on('update', function(peer, key, value) {
    if (key !== '__heartbeat__') {
      var data = this.resistCrypt.decrypt(peer, key, value);

      if (this.resistCrypt.validate(peer, key, data)) {
        // XXX: add stats collection and logging here
        // console.log("CONFIG: peer " + peer + " set " + key + " to " + value);
        // console.log(value);
        this.set(key, data);
      }
    }
  }.bind(this));
}

Config.prototype.get = function (host) {
  if (this.config[host]) {
    return this.config[host];
  } else {
    return null;
  }
};

Config.prototype.set = function (host, configuration) {
  configuration = this.resistCrypt.sign(host, configuration);
  var ciphertext = this.resistCrypt.encrypt(host, configuration);
  this.config[host] = configuration;
  this.gossip.setLocalState(host, ciphertext);
};

Config.prototype.destroy = function () {
  this.gossip.stop();
};

module.exports = Config;
